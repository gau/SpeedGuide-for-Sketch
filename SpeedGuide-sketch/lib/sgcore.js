//==================================================
// アラート表示
//==================================================
function showAlert(mainstr, substr) {
	var alert = COSAlertWindow.new();
	alert.addButtonWithTitle('OK');
	alert.setMessageText(mainstr);
	if(substr.length > 0) alert.setInformativeText(substr);
	var responseCode = alert.runModal();
}
//==================================================
// ガイドのプロトタイプ
//==================================================
function Guide(obj) {
	var prop = {
		origin:null,
		val:null,
		units:null,
		invert:false,
		center:false,
		repeat:1,
		span:0,
		spanUnits:null,
		direction:null,
		artboad:null
	};
	for (var key in prop){
		this[key] = prop[key];
	}
	this.setPropaties(obj);
}
Guide.prototype.setPropaties = function(obj) {
	for (var prop in obj){
		this[prop] = obj[prop];
	}
};
Guide.prototype.init = function() {
	if(this.val != null) {
		if(isNaN(this.val)){
			this.val = calcValue(this.val);
		}
		if(isNaN(this.span)){
			this.span = calcValue(this.span);
		}
		if(!isNaN(this.val) && !isNaN(this.span) && !isNaN(this.repeat)){
			if(this.units == "%") {
				this.val = this.convertToPixel(this.val, this.units);
				this.units = "px";
			}
			if(this.spanUnits == "%") {
				this.span = this.convertToPixel(this.span, this.spanUnits);
				this.spanUnits = "px";
			}
			this.val = this.getOffset(this.val, this.artboad, true);
			this.val = Number(this.val);
			this.span = Number(this.span);
		}
	} else {
		//Null
	}
};
Guide.prototype.getOffset = function(val, abs, isOffset) {
	if(isOffset) {
		if(this.center) val = val + abs / 2;
		if(this.invert) val = abs - val;
	}
	return val;
};
Guide.prototype.convertToPixel = function(val, units) {
	if(units == "%") {
		// val = Math.round(this.artboad * val / 100);
		val = this.artboad * val / 100;
	}
	return val;
};
Guide.prototype.validationError = function() {
	var er = true;
	if(this.val != null && !isNaN(this.val)) {
		er = false;
	} else {
		er = true;
	}
	if(this.units != null && !this.units.match(/^px$|^pixel$|^%$|^percent$|^pct$/i) && this.units.length > 0) {
		er = true;
	}
	if(this.spanUnits != null && !this.spanUnits.match(/^px$|^pixel$|^%$|^percent$|^pct$/i) && this.spanUnits.length > 0) {
		er = true;
	}
	if(this.repeat == -1) er = false;
	return er;
};


//==================================================
//データの整形
//==================================================
function getGuides(str, drc, atb) {
	var guideData=[], repArray=[], abs;
	// 向きのチェック
	switch(drc) {
		case "ver" :
			abs = atb[0];
			break;
		case "hor" :
			abs = atb[1];
			break;
		default :
			abs = null;
			break;
	}
	// 引数をチェック
	if(str.length < 1) return false;
	// 全角を半角に変換
	str = str.replace(/　/g," ");
	str = str.replace(/[！-～]/g, function(s) {
		return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
	});
	var sptArray = str.split(" ");
	// 配列を分割してハッシュに
	for (var i=0; i<sptArray.length; i++) {
		if(sptArray[i].length > 0) {
			var guide = new Guide({origin:sptArray[i], direction:drc, artboad:abs});
			//繰り返し数取得
			var regArray = /(.+)(@)([0-9]+)$/gi.exec(sptArray[i]);
			if(regArray){
				guide.repeat = parseInt(regArray[3]);
				sptArray[i] = regArray[1];
			}
			delete regArray;
			// オフセット取得
			var regArray = /(.+)(>)([^a-z%@]+)([a-z%]*)$/gi.exec(sptArray[i]);
			if(regArray){
				guide.span = regArray[3];
				if(regArray[4].length > 0) {
					guide.spanUnits = regArray[4];
				} else {
					guide.spanUnits = "px";
				}
				sptArray[i] = regArray[1];
			}
			// ガイドデータ取得
			delete regArray;
			regArray = /^(.*[^a-z%])([a-z%]*)$/gi.exec(sptArray[i]);
			if(regArray && regArray.length>2) {
				guide.val = regArray[1];
				if(regArray[2].length > 0) {
					guide.units = regArray[2];
				} else {
					guide.units = "px";
				}
			}
			// 起点を取得（:や$が付加された数値）
			if(guide.val && guide.val.match(/^:|\$/)){
				if(guide.val.match(/:/)){
					guide.invert = true;
					guide.val = guide.val.replace(/:/, "");
				}
				if(guide.val.match(/\$/)) {
					guide.center = true;
					guide.val = guide.val.replace(/\$/, "");
				}
			}
			// 間隔指定がない繰り返し
			if(guide.repeat > 1 && guide.span == 0) {
				guide.span = guide.val;
				guide.spanUnits = guide.units;
			}
			if(!guide.val || guide.val.length < 1) guide.val = null;
			guide.init();
			// 繰り返し処理
			if(guide.repeat > 1 && guide.span != 0) {
				var c = guide.repeat;
				guide.repeat = 1;
				for(var j=1; j<c; j++) {
					var rGuide = new Guide(guide);
					rGuide.repeat = -1;
					(rGuide.invert)? rGuide.val -= guide.span*j : rGuide.val += guide.span*j ;
					repArray.push(rGuide);
				}
			}
			guideData.push(guide);
		}
	}
	if(repArray.length > 0) guideData = guideData.concat(repArray);
	return guideData;
}
//==================================================
//四則演算の結果を返す（演算不可の場合はそのままの値を返す）
//==================================================
function calcValue(val) {
	var reslt;
	if(val.match(/^[\(\{\[\-\+0-9][\(\{\[\-\+\*\/\)\}\]\.0-9]*[\)\}\]0-9]$/)){
		try {
			reslt = eval(val);
		} catch(e) {
			// alert("演算失敗");
			reslt = val;
		}
	} else {
		// alert("演算不可");
		reslt = val;
	}
	return reslt;
}