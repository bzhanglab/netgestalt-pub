/* ------------------------------------------------------------------------- */
#ifndef LEXICAL_CAST_H
#define LEXICAL_CAST_H

#include <sstream>
#include <string>
#include <ios>
#include <iomanip>
#include <iostream>
#include <typeinfo>

	class bad_lexical_cast : public std::bad_cast {
	public:
		bad_lexical_cast() : source_(&typeid(void)), target_(&typeid(void)) {}
		explicit bad_lexical_cast(const std::type_info& source, const std::type_info& target) :
			source_(&source), target_(&target) {}
		virtual ~bad_lexical_cast() throw() {}
		
		const std::type_info& source_type() const { return *source_; }
		const std::type_info& target_type() const { return *target_; }
		
		virtual const char* what() const throw() {
			return "bad lexical cast";
		}
		
	private:
		const std::type_info* source_;
		const std::type_info* target_;
	};
	
	namespace detail {
		/* ----------------------------------------------------------------- */
		//  stream_char
		/* ----------------------------------------------------------------- */
		template <typename Type>
		struct stream_char {
			typedef char type;
		};
		
		/* ----------------------------------------------------------------- */
		//  widest_char
		/* ----------------------------------------------------------------- */
		template <typename TypeChar, typename SourceChar>
		struct widest_char {
			typedef TypeChar type;
		};
		
#ifdef CLX_USE_WCHAR
		/* ----------------------------------------------------------------- */
		//  wchar_t support
		/* ----------------------------------------------------------------- */
		template <class CharT, class Traits, class Alloc>
		struct stream_char<std::basic_string<CharT, Traits, Alloc> > {
			typedef CharT type;
		};
		
		template <>
		struct stream_char<wchar_t> {
			typedef wchar_t type;
		};
		
		template <>
		struct stream_char<wchar_t*> {
			typedef wchar_t type;
		};
		
		template <>
		struct stream_char<const wchar_t*> {
			typedef wchar_t type;
		};
		
		template <>
		struct widest_char<char, wchar_t> {
			typedef wchar_t type;
		};
#endif // CLX_USE_WCHAR
	};
	
	/* --------------------------------------------------------------------- */
	//  cast_stream
	/* --------------------------------------------------------------------- */
	template <class Type, class Source>
	class cast_stream {
	public:
		typedef Source src_type;
		typedef Type dest_type;
		typedef typename detail::widest_char<
			typename detail::stream_char<Type>::type,
			typename detail::stream_char<Source>::type
		>::type char_type;
		typedef std::basic_string<char_type> string_type;
		typedef std::basic_stringstream<char_type> internal_stream;
		
		// constructor and destructor
		explicit cast_stream(std::ios::fmtflags base = std::ios::dec) : ss_() {
			ss_.setf(base, std::ios::basefield);
		}
		
		virtual ~cast_stream() {}
		
		// operator
		bool operator<<(const src_type& src) {
			ss_ << std::setiosflags(std::ios::fixed);
			return !(ss_ << src).fail();
		}
		
		template <class ValueT>
		bool operator>>(ValueT& dest) {
			return !(ss_ >> dest).fail();
		}
		
		// speciallized for string_type;
		bool operator>>(string_type& dest) {
			dest = ss_.str();
			return true;
		}
		
	private:
		internal_stream ss_;
	};
	
	/* --------------------------------------------------------------------- */
	/*!
	 *  lexical_cast
	 *
	 *  The lexical_cast class is a sub-set class of boost::lexical_cast.
	 *  Scale back the function of wide string support.
	 */
	/* --------------------------------------------------------------------- */
	template <class Type, class Source>
	inline Type lexical_cast(const Source& src, std::ios::fmtflags base = std::ios::dec) {
		Type dest;
		if (typeid(Source) == typeid(Type)) return *((Type*)&src); // no needs to convert
		cast_stream<Type, Source> ss(base);
		if(!(ss << src && ss >> dest)) {
			throw bad_lexical_cast(typeid(Source), typeid(Type));
		}
		return dest;
	}

#endif 
