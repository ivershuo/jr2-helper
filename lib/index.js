(function(isNode){
	var isArray;
	if(isNode){
		var util = require('util');
		isArray	 = util.isArray;
	} else {
		isArray = Array.isArray || function(obj){ return obj != null && obj.constructor != null && Object.prototype.toString.call(obj).slice(8, -1) === 'Array';};
	}

	var JSONRPC_VERSION = '2.0';
	var ERRORS = {
		PARSE_ERROR         : {
			code     : -32700,
			message  : 'Parse error'
		},
		INVALID_REQUEST     : {
			code     : -32600,
			message  : 'Invalid Request'
		},
		METHOD_NOT_FOUND    : {
			code     : -32601,
			message  : 'Method not found'
		},
		INVALID_PARAMS      : {
			code     : -32602,
			message  : 'Invalid params'
		},
		INTERNAL_ERROR      : {
			code     : -32603,
			message  : 'Internal error'
		},
		UNKNOW_ERROR        : {
			code     : -32000,
			message  : 'Unknow error'
		},	
		VERSION_NOT_MATCH   : {
			code     : -32001,
			message  : 'Only support version 2.0'
		},
		INVALID_RESPONSE_ID : {
			code     : -32050,
			message  : 'Invalid Response id'
		},
		TIME_OUT            : {
			code     : -32051,
			message  : 'Time out'
		}
	};

	var errorMap = {};
	var ERROR_CODES = (function(){
		var errorCodes = {};
		for(var error in ERRORS){
			errorCodes[error] = parseInt(ERRORS[error].code, 10);
			errorMap[ERRORS[error].code.toString()] = error;
		}
		return errorCodes;
	})();

	var JsonRPC = {
		VERSION : JSONRPC_VERSION,
		ERRORS : ERRORS,
		ERROR_CODES : ERROR_CODES,
		valid : function(rpcObj, isRequestData){
			if(!isRequestData && rpcObj.method){
				isRequestData = true;
			}
			if(isRequestData){
				var id = rpcObj.id,
					params = rpcObj.params;
				if(!rpcObj.method || typeof id !== 'string' && typeof id !== 'number' && typeof id !== 'undefined' && id === null){
					return ERROR_CODES.INVALID_REQUEST;
				} else if(params && typeof params !== 'object'){
					return ERROR_CODES.INVALID_PARAMS;
				}
			} else {
				if(!(!!('result' in rpcObj) ^ !!rpcObj.error)){
					return ERROR_CODES.INTERNAL_ERROR;
				} else if(typeof id !== 'string' && typeof id !== 'number' && id === null){
					return ERROR_CODES.INVALID_RESPONSE_ID;
				}
			}
			if(!rpcObj.jsonrpc || rpcObj.jsonrpc != JSONRPC_VERSION){
				return ERROR_CODES.VERSION_NOT_MATCH;
			}

			return rpcObj;
		},
		parse : function(rpcStr, isRequestData){
			try{
				var rpcObj = JSON.parse(rpcStr);
			} catch(e){
				return ERROR_CODES.PARSE_ERROR;
			}
			if(!isArray(rpcObj)){
				return JsonRPC.valid(rpcObj, isRequestData);
			} else if(rpcObj.length){
				var multiRpcObj = [];
				while(rpcObj.length){
					var rpcObjSingle = rpcObj.shift();
					multiRpcObj.push(JsonRPC.valid(rpcObjSingle, isRequestData));
				}
				return multiRpcObj;
			} else {
				return ERROR_CODES.INVALID_REQUEST;
			}
		},	
		format : function(rpcObj){
			rpcObj.jsonrpc = rpcObj.jsonrpc || JSONRPC_VERSION;
			return JSON.stringify(rpcObj);
		},
		validCode : function(code){
			code = parseInt(code, 10);
			return errorMap[code.toString()] ? code : (code >= -32099 && code <= -32000 ? code : ERROR_CODES.UNKNOW_ERROR);
		},
		resErrFmt : function(code, message, id, data){
			if(typeof message === 'number' && typeof code === 'number'){
				code = {
					code : code,
					data : id
				}
			}
			if(typeof code === 'object'){
				data = id || code.data;
				id = message;
				message = code.message;
				code = code.code;
			}
			code = JsonRPC.validCode(code);
			message = message || ERRORS[errorMap[code.toString()]].message || ERRORS.UNKNOW_ERROR.message;
			var errData = {
				code : code,
				message : message
			}
			data && (errData.data = data);
			if(typeof id !== 'number' || code === ERROR_CODES.INVALID_REQUEST || code === ERROR_CODES.PARSE_ERROR){
				id = null;
			}
			var resObj = {
				id : id || null,
				error : errData
			}
			return JsonRPC.format(resObj);
		},
		resFmt : function(result, id){
			if(typeof id === 'number'){
				return JsonRPC.format({
					id     : id,
					result : result
				});
			} else {
				return JsonRPC.resErrFmt(ERRORS.INVALID_RESPONSE_ID, null, result);
			}
		},
		reqFmt : function(method, params, id){
			try{
				params = JSON.parse(JSON.stringify(params));
			} catch(e){
				params = null;
			}
			params = typeof params === 'number' ? [params] : params || [];
			var queryObj = {
				method : method,
				params : params
			}
			id && (queryObj.id = parseInt(id, 10));
			return JsonRPC.format(queryObj);
		},
		reqFmtBatch : function(){
			var requests = [],
				reqFmt = JsonRPC.reqFmt;
			for(var i = 0, l = arguments.length; i < l; i++){
				var request = arguments[i];
				requests.push(reqFmt.apply(JsonRPC, request));
			}
			return '[' + requests.join(',') + ']';
		}
	};

	if(isNode){
		module.exports = JsonRPC;
	} else {
		window.JsonRPC = JsonRPC;
	}
})(typeof(module) != 'undefined' && module.exports);