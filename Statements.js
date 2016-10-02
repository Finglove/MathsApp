/*

Statements system.

A statement is a complete mathematical sentence e.g. "X >= 4Y+12".

Inputs such as "A = B > C = D" should be broken up as a number of separate statements.

Structure: A statement is a relationship between two expressions.

*/

var Statements = {};

Statements.receive = function(input){
	//Takes in a full line of maths
	//First we must find all the verbs and break it up into "true" statements.
	var chunks = {};
	chunks = Statements.identifyChunks(input)
	var foundStatements = [];
	
	var i = 0;
	
	
	//This clips off the first verb and provides linking if needed.
	// e.g. "= X + 4" links this line with the previous one.
	if(chunks.startsWithVerb){
		foundStatements.push(Statements.Statement(
			{left: Statements.Link(
				{direction: "left"}
			),
			right: chunks.expressionsList[0],
			relation: chunks.verbsList.shift()
			}
		))
	}
	
	//Similar, but for the end (although this is poor syntax, someone is going to try and do it)
	// e.g. "X + 4=" links this line with the next one.
	//Held in temp to keep the statements in order
	var endStatement = {};
	if(chunks.endsWithVerb){
		endStatement = (Statements.Statement(
			{right: Statements.Link(
				{direction: "right"}
			),
			left: chunks.expressionsList[chunks.expressionsList.length-1],
			relation: chunks.verbsList.pop()
			}
		))
	}
	
	for(i = 0; i < chunks.verbsList.length; i++){
			foundStatements.push(Statements.Statement(
				{
					left:chunks.expressionsList[i],
					right: chunks.expressionsList[i+1],
					relation: chunks.verbsList[i]
				}
					))
	}
	if(chunks.endsWithVerb){
		foundStatements.push(endStatement);
	}
	
	return foundStatements;
}

Statements.Statement = function(options){
	var s = {};
	s.left = options.left;
	s.right = options.right;
	s.relation = options.relation;
	
	s.type = "MA.statement";
	s.uuid = E.guid();
	return s;
}

Statements.Link = function(options){
	var l = {};
	l.direction = options.direction;
	
	l.type="MA.link";
	l.uuid = E.guid();
	return l;
}

Statements.identifyChunks = function(input){
	var possibleVerbParts = /[<=>]/;
	var startsWithVerb = possibleVerbParts.test(input[0]);
	var endsWithVerb = possibleVerbParts.test(input[input.length-1]);
	
	var expressionsList = [];
	var verbsList = [];
	
	var inExpression = !startsWithVerb;
	var i = 0;
	var isVerb = false;
	var marker = 0;
	for(i = 0; i < input.length;i++){
		isVerb = possibleVerbParts.test(input[i]);
		if(inExpression){
			if(isVerb){
				expressionsList.push(input.slice(marker,i));
				marker = i;
				inExpression = false;
				}			
		}else{
			if(!isVerb){
				verbsList.push(input.slice(marker,i));
				marker = i;
				inExpression = true;
			}
		}
		
	}
		if(inExpression){
			expressionsList.push(input.slice(marker,input.length));
		}else{
			verbsList.push(input.slice(marker,input.length));
		}
	return {expressionsList:expressionsList, verbsList: verbsList, startsWithVerb: startsWithVerb, endsWithVerb: endsWithVerb}	
	
}