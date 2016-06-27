#ifndef _STRINGREF_H_
#define _STRINGREF_H_
#include <iostream>                                                              
#include <string>
#include <sstream>
#include <time.h>
#include <vector>
    
class StringRef
{
 private:
  char const*     begin_;
  int             size_;

 public:
  int size() const { return size_; }
  char const* begin() const { return begin_; }
  char const* end() const { return begin_ + size_; }

  StringRef( char const* const begin, int const size )
   : begin_( begin )
     , size_( size )
 {}
};
    
#endif
