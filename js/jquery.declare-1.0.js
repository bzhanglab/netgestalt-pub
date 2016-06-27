/**
 * @name jquery.declare
 * a jQuery plugin like d-o-j-o declare.
 * The only difference is that the consturctor of a class is "init", not "constructor".
 */
(function() {
	var contextStack = [];
	
	function inherits(childCtor, parentCtor) {
		function tempCtor() {
		};
		tempCtor.prototype = parentCtor.prototype;
		childCtor.$superCtor = parentCtor;
		childCtor.prototype = new tempCtor();
		childCtor.prototype.constructor = childCtor;
	}
	
	//provides a namespace like a.b.c
	function namespace(namespace, root) {
		var parts = namespace.split('.'), current = root || window;
		if(!(parts[0] in window)) {
			window[parts[0]] = {};
		}
		for(var part; parts.length && ( part = parts.shift()); ) {
			if(!current[part]) {
				current[part] = {};
			}

			current[part].$parentModule || (current[part].$parentModule = current);
			current = current[part];
			current.$moduleName = part;
		}
		return current;
	}
	
	var safeMixin = function() {
		var baseClass = arguments[0], clazzs = [].slice.call(arguments, 1);
		for(var i = 0, len = clazzs.length; i < len; i++) {
			var clazz = clazzs[i];
			$.extend(baseClass.prototype, clazz.prototype);
		}
	};
	
	var getPpFn = function(ctor, fn, fnName) {
		var superCtor = ctor.$superCtor,
			superProto = superCtor.prototype;
		if(fn !== superProto[fnName]) {
			return superProto[fnName];
		} else {
			return getPpFn(superCtor, fn, fnName);
		}
	};
	/**
	 * Get the name of a function in the class ctor
	 */
	var getFnName = function(ctor, fn) {
		//The function name is cached
		if(fn.$name) {
			return fn.$name;
		}
		var fnName = null, 
			proto = ctor.prototype;
		for(var key in proto) {
			if(proto.hasOwnProperty(key)) {
				if(proto[key] === fn) {
					fnName = key;
				}
			}
		}
		if(fnName == null ) {
			return getFnName(ctor.$superCtor, fn);
		}
		//Cache the function name for next call
		fn.$name = fnName;
		return fnName;
	};
	
	var declare = function(className, parents, proto) {
		var current = null,
			parent = null;
			ctor = null;
			
		//Called like $.declare(parents, proto)
		if($.type(className) !== "string") {
			proto = parents;
			parents = className;
			className = null;
		}
		
		//Class real construtor
		ctor = function() {
			if(className) {
				this.$className = className;
			}
			this.$class = ctor;
			
			if(proto && proto.hasOwnProperty("init")) {
				this.init.apply(this, arguments);
			}
		};
		
		if(parents && $.isArray(parents)) {
			parent = parents.shift();
		} else {
			parent = parents;
		}
		
		parent && inherits(ctor, parent);
		$.extend(ctor.prototype, proto);
		
		//this.inherited(arguments, [1, 3])
		ctor.prototype.inherited = function() {
			var ctor = this.constructor,
				fn = arguments[0].callee,
				args = Array.prototype.slice.call(arguments),
				origArgs = Array.prototype.slice.call(args.shift());
				fnName = getFnName(ctor, fn);
			
			fn = getPpFn(ctor, fn, fnName);
			if(args[0]) {
				origArgs = origArgs.concat(args[0]);
			}
			return fn.apply(this, origArgs);
		};
		
		if(parents && parents.length > 0) {
			safeMixin.apply(null, [ctor].concat(parents));
		}
		
		if(className) {
			//Called like $.declare("A.B.C", parents, proto)
			 current = namespace(className);
			 current.$parentModule[current.$moduleName] = ctor;
		}
		
		return ctor;
	};
	
	jQuery.declare = declare;
})(jQuery);
