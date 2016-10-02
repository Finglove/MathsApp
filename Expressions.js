/*

Expressions system.

An expression is the mathematical equivalent of a noun. "X = Y" is a statement; X and Y are the expressions, with "=" being the verb.

Needs to hold the data as presented.
	- e.g. "X + X" rather than auto-simplifying

Needs to be able to:
	- evaluate
	- simplify (well-defined)

Plan:
	Breaks things into "top level" summands (i.e. deal with brackets properly)
	Each summand has a coefficient, which is an arithmetic term (e.g. 2x4, or 8, which are symbolically different)
	Need notions of sqrts etc. here.
*/


var Expressions = {};

Expressions.receive = function (input) {
	//needs checks for valid strings here!
	//Henceforth assume well-formed
	return Expressions.Expression({ rawText: input.trim() });
}

Expressions.Expression = function (options) {
	var e = {};
	e.rawText = options.rawText;

	var i = 0;


	var fundamentalTest = Expressions.deviseFundamental(e.rawText);
	if (fundamentalTest.isFundamental) {
		e = fundamentalTest.result;
		return e;
	}

	var summands = Expressions.breakToSummands(e.rawText);
	if (summands.length > 1) {
		var summandsAsExpressions = [];
		for (i = 0; i < summands.length; i++) {
			summandsAsExpressions.push(Expressions.receive(summands[i]));
		}
		e = Expressions.Sum({ summands: summandsAsExpressions });
		return e;
	}

	var exponent = Expressions.breakToExponents(e.rawText);
	if (exponent.found) {
		var base = Expressions.receive(exponent.base);
		var exp = Expressions.receive(exponent.exponent);
		e = Expressions.Exponent({ base: base, exponent: exp });
		return e;
	}

	var fraction = Expressions.breakToFractions(e.rawText);
	if (fraction.found) {
		var num = Expressions.receive(fraction.numerator);
		var denom = Expressions.receive(fraction.denominator);
		e = Expressions.Fraction({ numerator: num, denominator: denom })
		return e;
	}

	var multiplicands = Expressions.breakToMultiplicands(e.rawText);
	if (multiplicands.length > 1) {
		var multiplicandsAsExpressions = [];
		for (i = 0; i < multiplicands.length; i++) {
			multiplicandsAsExpressions.push(Expressions.receive(multiplicands[i]));
		}
		e = Expressions.Product({ multiplicands: multiplicandsAsExpressions });
		return e;
	}



	if (Expressions.regex.openner.test(e.rawText[0])) {
		var inner = Expressions.stripOutterBracket(e.rawText);
		return Expressions.Bracketed({ inner: Expressions.receive(inner), bracket: e.rawText[0] })
	}


	return e;
}

Expressions.evaluate = function (input, evaluations) {
	var s = {};
	var resolved = {};
	var i = 0;
	switch (input.type) {
		case "MA.expressions.label":
			if (typeof (evaluations[input.name]) !== "undefined") {
				return evaluations[input.name]; //CHANGE: needs to be a different instance.
			} else {
				return input;
			}
			break;

		case "MA.expressions.exponent":
			resolved = Expressions.Exponent({});
			resolved.base = Expressions.evaluate(input.base, evaluations);
			resolved.exponent = Expressions.evaluate(input.exponent, evaluations);

			return resolved;
			break;
		case "MA.expressions.sum":
			resolved = Expressions.Sum({});
			s = {};
			i = 0;
			for (i = 0; i < input.summands.length; i++) {
				s = input.summands[i];
				resolved.summands.push(Expressions.evaluate(s, evaluations));
			}

			return resolved;
			break;

		case "MA.expressions.product":
			resolved = Expressions.Product({});
			s = {}
			i = 0;
			for (i = 0; i < input.multiplicands.length; i++) {
				s = input.multiplicands[i];
				resolved.multiplicands.push(Expressions.evaluate(s, evaluations));
			}

			return resolved;
			break;
		case "MA.expressions.fraction":
			resolved = Expressions.Fraction({});
			resolved.numerator = Expressions.evaluate(input.numerator, evaluations);
			resolved.denominator = Expressions.evaluate(input.denominator, evaluations);

			return resolved;
			break;
		case "MA.expressions.bracketed":
			resolved = Expressions.Bracketed({ inner: Expressions.evaluate(input.inner, evaluations), bracket: input.bracket });

			return resolved;
			break;
		default:
			return input;
			break;
	}
}

//Stringification for output:
Expressions.stringify = function (input) {
	var s = "";
	var stringify = Expressions.stringify;
	switch (input.type) {
		case "MA.expressions.bracketed":
			return "" + input.bracket + stringify(input.inner) + Expressions.matchBrackets[input.bracket];
			break;
		case "MA.expressions.exponent":
			s += "(";
			s += stringify(input.base);
			s += ")"
			s += "^"
			s += "(";
			s += stringify(input.exponent);
			s += ")"
			return s;
			break;
		case "MA.expressions.product":
			var i = 0;
			s += stringify(input.multiplicands[0]);
			for (i = 1; i < input.multiplicands.length; i++) {
				s += "*";
				s += stringify(input.multiplicands[i]);
			}
			return s;
			break;
		case "MA.expressions.sum":
			var i = 0;
			s += stringify(input.summands[0]);
			for (i = 1; i < input.summands.length; i++) {
				s += "+";
				s += stringify(input.summands[i]);
			}
			return s;
			break;
			break;
		case "MA.expressions.fraction":
			s += "(";
			s += stringify(input.numerator);
			s += " / ";
			s += stringify(input.denominator);
			s += ")";
			return s;
			break;
		case "MA.expressions.label":
			s += "{";
			s += input.name;
			s += "}";
			return s;
			break;
		case "MA.expressions.number":
			s += input.value;
			return s;
			break;
		default:
			return input;
	}
	return s;
}

//Takes in expressions, returns expressions in an expanded form
Expressions.expand = function (input) {
	var i = 0;
	var expanded = {};

	switch (input.type) {
		case "MA.expressions.bracketed":
			return Expressions.expand(input.inner);
			break;
		case "MA.expressions.fraction":
			expanded = Expressions.Fraction({});
			expanded.numerator = Expressions.expand(input.numerator);
			expanded.denominator = Expressions.expand(input.denominator);

			return expanded;
			break;
		case "MA.expressions.exponent":
			expanded = Expressions.Exponent({});
			expanded.base = Expressions.expand(input.base);
			expanded.exponent = Expressions.expand(input.exponent);

			var exp = expanded.exponent;
			if (exp.type === "MA.expressions.number") {
				if (exp.isNatural) {
					expanded = Expressions.operations.power(expanded.base, exp);
				}
			}

			if(expanded.type === "MA.expressions.exponent"){
				return expanded;
			}
			return Expressions.expand(expanded);
			break;
		case "MA.expressions.sum":
			expanded = Expressions.Sum({})
			var s = {};
			
			//First expand each subobject
			for (i = 0; i < input.summands.length; i++) {
				s = input.summands[i];
				expanded.summands.push(Expressions.expand(s));


			}

			//Then gather the number terms (will be like terms later)
			var returning = Expressions.Sum({});
			var heldNumber = Expressions.Number({ value: 0 });
			for (i = 0; i < expanded.summands.length; i++) {
				s = expanded.summands[i];
				if (s.type === "MA.expressions.number") {
					heldNumber.value += s.value;
				} else {
					returning.summands.push(s);
				}
			}


			//Return either a .sum or a .number depending on number of summands
			if (heldNumber.value !== 0) {
				returning.summands.push(heldNumber);
			}
			if (returning.summands.length === 0) {
				return Expressions.Number({ value: 0 });
			}
			else if (returning.summands.length === 1) {
				return returning.summands[0];
			}


			return returning;
			break;

		case "MA.expressions.product":
			expanded = Expressions.Product({})
			var s = {};
			
			//First expand each subobject
			for (i = 0; i < input.multiplicands.length; i++) {
				s = input.multiplicands[i];
				expanded.multiplicands.push(Expressions.expand(s));
			}
			
			//pull any products higher up the tree
			var flattened = Expressions.Product({});
			var j = 0;
			for (i = 0; i < expanded.multiplicands.length; i++) {
				s = expanded.multiplicands[i];
				if (s.type === "MA.expressions.product") {
					for (j = 0; j < s.multiplicands.length; j++) {
						flattened.multiplicands.push(s.multiplicands[j]);
					}
				} else {
					flattened.multiplicands.push(s);
				}
			}
			expanded = flattened;
			
			//expand any brackets
			//If we had brackets, then we end up with a sum, and so we ask to expand in turn:
			var bracketTerms = [];
			var ii = {};
			for (i = 0; i < expanded.multiplicands.length; i++) {
				ii = expanded.multiplicands[i];
				if (ii.type === "MA.expressions.sum") {
					bracketTerms.push([])
					var j = 0;
					for (j = 0; j < ii.summands.length; j++) {
						bracketTerms[i].push(ii.summands[j]);
					}
				} else {
					bracketTerms.push([ii])
				}
			}

			var dummyOne = Expressions.Number({ value: 1 });
			var expanded = Expressions.Sum({ summands: [dummyOne] });
			var mult = Expressions.operations.multiply;
			var add = Expressions.operations.add;
			expanded = bracketTerms.reduce(function (a, b) {
				var i = 0;
				var j = 0;
				var summands = [];
				for (i = 0; i < a.summands.length; i++) {
					for (j = 0; j < b.length; j++) {
						summands.push(mult(a.summands[i], b[j]));
					}

				}
				return Expressions.Sum({ summands: summands });
			}, expanded)

			if (expanded.summands.length > 1) {
				return Expressions.expand(expanded);
			} else {
				expanded = expanded.summands[0];
			}

			
			
			//Then gather the number terms (will be like terms later)
			var returning = Expressions.Product({});
			var heldNumber = Expressions.Number({ value: 1 });
			for (i = 0; i < expanded.multiplicands.length; i++) {
				s = expanded.multiplicands[i];
				if (s.type === "MA.expressions.number") {
					heldNumber.value *= s.value;
				} else {
					returning.multiplicands.push(s);
				}
			}


			//Return either a .product or a .number depending on number of summands
			if (heldNumber.value !== 1) {
				returning.multiplicands.unshift(heldNumber);
			}
			if (returning.multiplicands.length === 0) {
				return Expressions.Number({ value: heldNumber.value });
			}
			else if (returning.multiplicands.length === 1) {
				return returning.multiplicands[0];
			}
			
			//Now test for 0 (better late than never)
			if(returning.multiplicands[0].type === "MA.expressions.number" && returning.multiplicands[0].value === 0){
				return Expressions.Number({value: 0});
			}


			return returning;
			break;
		default:
			return input;
	}
}


Expressions.groupLikeTerms = function(input,groupByLabel){
			var returningPolynomial = Expressions.Sum({});
	switch(input.type){
		case "MA.expressions.sum":
			var i = 0;
			//You had better be sure that monomialDegree works!
			var monomialsWithDegree = [];
			var deg = 0;
			var groupedTerms = {};
			for(i=0;i<input.summands.length;i++){
				deg = Expressions.monomialDegree(input.summands[i],groupByLabel);
				groupedTerms[deg] = Expressions.Sum({});
				monomialsWithDegree.push([deg,input.summands[i]]);
			}
			var m = {};
			var mWithLabelRemoved = {};
			for(i=0;i<monomialsWithDegree.length;i++){
				m = monomialsWithDegree[i];
				if(!isNaN(Number(m[0]))){
				mWithLabelRemoved = Expressions.evaluate(m[1],{"X":Expressions.Number({value:1})});
				groupedTerms[m[0]].summands.push(mWithLabelRemoved)
				}else{
					//evaluate emptily anyway to create a new instance
					groupedTerms[m[0]].summands.push(Expressions.evaluate(m[1],{}));
									}
			}
			var d = "";
			var e = Expressions.Number({value: 0});
			for(d in groupedTerms){
				var monomial;
				e = Expressions.Number({value: 0});
				if(isNaN(Number(d))){
					monomial = groupedTerms[d];
					}else{
						e.value = d;
				var labelTerm = Expressions.Exponent({base: groupByLabel, exponent: e})
				monomial = Expressions.Product({multiplicands:[groupedTerms[d],labelTerm]});
				}
				returningPolynomial.summands.push(monomial);
			}
		break;
		default:
		returningPolynomial.summands.push(input);
	}
	return returningPolynomial;
}

Expressions.monomialDegree = function(input, label){
	var deg = 0;
	switch(input.type){
		case "MA.expressions.product":
		var i = 0;
		var m = input.multiplicands;
			for(i = 0; i < m.length; i++){
				deg+=Expressions.monomialDegree(m[i],label);
			}
			break;
		case "MA.expressions.label":
			if(input.name === label.name){
				deg++;
			}
		break;
		case "MA.expressions.fraction":
			deg+=Expressions.monomialDegree(input.numerator,label);
			deg-=Expressions.monomialDegree(input.denominator,label);
		break;
		case "MA.expressions.bracketed":
		deg += Expressions.monomialDegree(input.inner,label);
		break;
		case "MA.expressions.exponent":
		if(input.exponent.type === "MA.expressions.number"){
		deg += (Expressions.monomialDegree(input.base,label)*input.exponent.value)
		}else{
			deg = NaN;
		}
		break;
		case "MA.expressions.number":
		break;
		case "MA.expressions.sum":
		case "MA.expressions.function":
		return NaN;
		default:
		break;
	}
	return deg;
}

Expressions.breakToSummands = function (input) {

	var summands = [];
	var positiveSign = true;

	var openners = Expressions.regex.openner;
	var closers = Expressions.regex.closer;
	var arithmetic = Expressions.regex.arithmetic;

	var i = 0;
	var marker = 0;
	var ii = ""; //shorthand for current character
	var depth = 0;
	for (i = 0; i < input.length; i++) {
		ii = input[i];
		if (openners.test(ii)) {
			depth++;
		} else if (closers.test(ii)) {
			depth--;
		} else {
			//not a bracket
			if (depth === 0) {
				if (arithmetic.test(ii)) {
					if (i !== marker) {
						summands.push((positiveSign ? "" : "-1*") + input.slice(marker, i));
					}
					(ii === "+" ? positiveSign = true : positiveSign = false);
					marker = i + 1;
				}
			}
		}
	}


	summands.push((positiveSign ? "" : "-1*") + input.slice(marker, input.length));
	return summands;
	//return Expressions.Sum({summnads: summands});
}

Expressions.breakToMultiplicands = function (input) {
	//Going to have to be careful with brackets and exponents:
	//e.g. X^(1+3) and X^1+3
	//Need to force parsing as {X^(1+3)} and {X^1}+3?
	//Things that denote mulitplication:
	// Exp*Exp
	// (Exp)(Exp)
	// Exp \label
	//
	// Force labels into {}?
	
	var openners = Expressions.regex.openner;
	var closers = Expressions.regex.closer;
	var multiplications = Expressions.regex.multiplication;

	var multiplicands = [];
	var i = 0;
	var marker = 0;
	var ii = ""; //shorthand for current character
	var depth = 0;
	for (i = 0; i < input.length; i++) {
		ii = input[i];
		if (openners.test(ii)) {
			depth++;
			if (depth === 1) {
				if (i !== marker) {
					multiplicands.push(input.slice(marker, i));
				}
				marker = i;
			}
		} else if (closers.test(ii)) {
			depth--;
			if (depth === 0) {
				if (i !== marker) {
					multiplicands.push(input.slice(marker, i + 1));
				}
				marker = i + 1;
			}
		} else {
			//not a bracket
			if (depth === 0) {
				if (multiplications.test(ii)) {
					if (i !== marker) {
						multiplicands.push(input.slice(marker, i));
					}
					marker = i + 1;
				}
			}
		}
	}
	if (marker < input.length) {
		multiplicands.push(input.slice(marker, input.length));
	}
	return multiplicands;
	//return Expressions.Product({multiplicands: multiplicands});
}

Expressions.breakToExponents = function (input) {
	var openners = Expressions.regex.openner;
	var closers = Expressions.regex.closer;
	var exponentRegEx = Expressions.regex.exponent;
	var base = {};
	var exponent = {};

	var i = 0;
	var marker = 0;
	var ii = ""; //shorthand for current character
	var depth = 0;
	var found = false;
	for (i = 0; i < input.length; i++) {
		ii = input[i];
		if (openners.test(ii)) {
			depth++;
		} else if (closers.test(ii)) {
			depth--;
		} else {
			//not a bracket
			if (depth === 0) {
				if (exponentRegEx.test(ii)) {
					if (i !== marker) {
						base = input.slice(0, i);
						exponent = input.slice(i + 1, input.length);
						i = input.length;
						found = true;
					}
				}
			}
		}
	}
	return { found: found, base: base, exponent: exponent };

}



Expressions.breakToFractions = function (input) {
	//fractions taken as being associative to the right:
	// a/b/c = a/(b/c)
	
	var openners = Expressions.regex.openner;
	var closers = Expressions.regex.closer;
	var division = Expressions.regex.division;

	var numerator = {};
	var denominator = {};

	var i = 0;
	var marker = 0;
	var ii = ""; //shorthand for current character
	var depth = 0;
	var found = false;
	for (i = 0; i < input.length; i++) {
		ii = input[i];
		if (openners.test(ii)) {
			depth++;
		} else if (closers.test(ii)) {
			depth--;
		} else {
			//not a bracket
			if (depth === 0) {
				if (division.test(ii)) {
					if (i !== marker) {
						numerator = input.slice(0, i);
						denominator = input.slice(i + 1, input.length);
						i = input.length;
						found = true;
					}
				}
			}
		}
	}
	return { found: found, numerator: numerator, denominator: denominator };
	//return Expressions.Fraction({numerator: numerator, denominator: denominator});
}

Expressions.stripOutterBracket = function (input) {
	var closer = Expressions.matchBrackets[input[0]];
	if (input[input.length - 1] === closer) {
		return input.substring(1, input.length - 1);
	}
	return Expressions.Error("Error stripping brackets", input)
}

Expressions.deviseFundamental = function (input) {
	var isFundamental = false;
	var result = {};
	if (Expressions.regex.number.test(input)) {
		isFundamental = true;
		result = Expressions.Number({ value: parseFloat(input) });
	} else if (Expressions.regex.function.test(input)) {
		isFundamental = true;
		result = Expressions.functionFromRaw(input)
	} else if (Expressions.regex.label.test(input)) {
		isFundamental = true;
		result = Expressions.Label({ name: input })
	}
	return { isFundamental: isFundamental, result: result };
}

Expressions.functionFromRaw = function (input) {
	var allowedFunctionBrackets = /\(/;
	var name = "";
	var inner = "";


	var i = 0;
	var marker = 0;
	for (i = 0; i < input.length; i++) {
		if (allowedFunctionBrackets.test(input[i])) {
			marker = i;
			i = input.length;
		}
	}
	name = input.substring(0, marker);
	inner = input.substring(marker + 1, input.length - 1)
	return Expressions.Function({ name: name, inner: inner });
}


Expressions.Fraction = function (options) {
	var f = {};
	f.numerator = options.numerator || 1;
	f.denominator = options.denominator || 1;

	f.type = "MA.expressions.fraction";
	f.uuid - E.guid();
	return f;
}

Expressions.Sum = function (options) {
	var s = {};
	s.summands = options.summands || [];

	s.type = "MA.expressions.sum";
	s.uuid = E.guid();
	return s;
}

Expressions.Product = function (options) {
	var p = {};
	p.multiplicands = options.multiplicands || [];

	p.type = "MA.expressions.product";
	p.uuid = E.guid();
	return p;
}

Expressions.Exponent = function (options) {
	var e = {};
	e.base = options.base || 1;
	e.exponent = options.exponent || 1;

	e.type = "MA.expressions.exponent";
	e.uuid = E.guid();
	return e;
}

Expressions.Number = function (options) {
	var n = {
		get isNatural() {
			return true;
		},
		set factors(input){
			this._factors = {};
			this._factors["-1"] = 0;
			var f = "0";
			for (f in input){
				if(input[f] !== 0){this._factors[f] = input[f]};
			}
			this._factors[-1] = this._factors[-1] % 2;
			delete this._factors[1];
			if(this._factors[0]>0){
				this.factors = {"-1":0,"0":1};
			}
		}
		,
		get factors() {
			return this._factors;
		},
		get value() {
			var v = 1;
			var f = "0";
			if(this.factors["0"] > 0){
				return 0;
			}
			for (f in this.factors) {
				v = v * Math.pow(parseInt(f), this.factors[f]);
			}
			return v;
		},
		set value(input){
			//Quick factorisation:
			//scaleFactor determines how many powers of ten to attempt to convert into a fraction rather than a decimal:
			//	e.g. 0.25 is factorised as 1/4, but 1/7 (when given by a decimal approximation) will be stored as a decimal approximation
			var scaleFactor = 4;
			var scaledUp = input*(Math.pow(10,scaleFactor));
			var factorsAsArray = Expressions.operations.primeFactorisation(scaledUp);
			var factorsAsObject = {};
			var f = "0";
			var i =0;
			for(i = 0;i<factorsAsArray.length;i++){
				f = factorsAsArray[i]
				factorsAsObject[f] = factorsAsObject.hasOwnProperty(f) ? factorsAsObject[f]+1 : 1;
			}
			factorsAsObject["2"] -= scaleFactor;
			factorsAsObject["5"] -= scaleFactor;
			this._factors = factorsAsObject;
		},
		
		get sign(){
			return ((-2)*(this.factors["-1"] % 2)+1);
		}
	};
	if(options.hasOwnProperty("value")){
	n.value = options.value;
	}
	else if(options.hasOwnProperty("factors")){
		n.factors = options.factors;
	}
	else{
		n.factors = {};
	}

	n.type = "MA.expressions.number";
	n.uuid = E.guid();
	return n;
}

Expressions.Function = function (options) {
	var f = {};
	f.name = options.name;
	f.inner = options.inner;

	f.type = "MA.expressions.function";
	f.uuid = E.guid();
	return f;
}

Expressions.Label = function (options) {
	var l = {};
	l.name = Expressions.stripOutterBracket(options.name);

	l.type = "MA.expressions.label";
	l.uuid = E.guid();
	return l;
}

Expressions.Bracketed = function (options) {
	var b = {};
	b.inner = options.inner;
	b.bracket = options.bracket;

	b.type = "MA.expressions.bracketed";
	b.uuid = E.guid();
	return b;
}

Expressions.Error = function (message, data) {
	var e = {};
	e.message = message;
	e.data = data;

	e.type = "MA.error"
	e.uuid = E.guid();
	return e;
}


Expressions.regex = {
	openner: /[\[\(\{]/,
	closer: /[\]\)\}]/,
	multiplication: /\*/,
	arithmetic: /[\+-]/,
	division: /\//,
	exponent: /\^/,
	number: /^[\-\+]?[0-9]+[\.]?[0-9]*$/,
	function: /^[^0-9\+\*\^\\\(\)\[\]\{\}]+\(.+\)$/,
	label: /^\{[^0-9\(\)\{\}\[\]]+\}$/
}

Expressions.matchBrackets = {
	"(": ")",
	")": "(",
	"{": "}",
	"}": "{",
	"[": "]",
	"]": "["

}

Expressions.operations = {};
Expressions.operations.add = function (a, b) {
	return Expressions.Sum({ summands: [a, b] });
}
Expressions.operations.multiply = function (a, b) {
	if (a.type === "MA.expressions.product") {
		return Expressions.Product({ multiplicands: a.multiplicands.concat([b]) });
	} else if (b.type === "MA.expressions.product") {
		return Expressions.Product({ multiplicands: b.multiplicands.concat([a]) });
	} else {
		return Expressions.Product({ multiplicands: [a, b] })
	}
}


//For natural-number powers only!
Expressions.operations.power = function (b, e) {
	var power = Expressions.operations.power;
	if(e.value === 0){
		return Expressions.Number({value :1});
	}
	switch (b.type) {
		case "MA.expressions.number":
			var f = {};
			var factor;
			for(factor in b.factors){
				f[factor] = b.factors[factor]*e.value;
			}
			return Expressions.Number({factors: f});
			break;
		case "MA.expressions.bracketed":
			return power(b.inner, e);
			break;
		case "MA.expressions.fraction":
			var d = power(b.denominator, e);
			var n = power(b.numerator, e);
			return Expressions.Fraction({ numerator: n, denominator: d });
			break;
		case "MA.expressions.exponent":
			var exp = Expressions.sum({ summands: [b.exponent, e] });
			return Expressions.Exponent({ base: b.base, exponent: exp });
		case "MA.expressions.sum":
		case "MA.expressions.product":
			var s = Expressions.expand(b);
			var t = Expressions.Number({ value: 1 })
			var i = 0;
			for (i = 0; i < e.value; i++) {
				t = Expressions.operations.multiply(t, s)
			}
			return t;
			break;
		default:
			return Expressions.Exponent({ base: b, exponent: e });
			break;
	}
}

//If the input X is not an integer
//Then it will be returned as [X] (i.e. its only factor)
Expressions.operations.primeFactorisation = function(a){
	var b = arguments[1] || [];
	if(a < 0){
		a = -a;
		b.push(-1);
	}
	else if(a === 0){
		return [0]
	}
	var root = Math.sqrt(a);
	var x = 2;
	
	if(a % x){x = 3;
		while((a%x) && ((x = x +2) < root)){};
		}
		x = (x <= root) ? x : a;
		b.push(x);
	return ( x===a) ? b : Expressions.operations.primeFactorisation(a/x, b);	
}