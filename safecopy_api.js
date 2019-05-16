// HUSK NEW RELIC PREFIX


//mysql setup and test data retrival


let mysql = require('mysql')

let express = require("express");

var bodyParser = require('body-parser')

let app = express();

var async = require("async");


const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())


const pool = mysql.createPool({
	connectionLimit: //any number,
	host: '',
	user: '',
	password: '',
	database: '',
	
})


//define listening path for R/N fetch queries

app.listen(port, () => {
	console.log('Server running on' + port)
   })

//check if user exist
app.post('/CheckUser', (req, res) => {
	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error fetching user")
		} else {
			conn.query(`SELECT * FROM products.users WHERE username = '${req.body.username}' AND password = '${req.body.password}';`, (err, result, rows, fields) => {	
				if (result.length === 0) {
					console.log(JSON.stringify({"status":404, "error": null, "response": "Oops! har du registrert deg? husk store forbokstaver der de hører hjemme!"}));
					res.send(JSON.stringify({"status":404, "error": null, "response": "Oops! har du registrert deg? husk store forbokstaver der de hører hjemme!"}));
				} else {
					console.log(JSON.stringify({"status":200, "error": null, "response": result}));
					res.send(JSON.stringify({"status":200, "error": null, "response": result}));
				}
			})
			conn.release()
		}
	})
})
// register a user
app.post('/RegUser', (req, res) => {
	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error registering user")
		} else {
			conn.query(`INSERT INTO products.users (username, password) VALUES ('${req.body.username}','${req.body.password}');`, (err, result, rows, fields) => {	
				console.log(JSON.stringify({"status":200, "error": null, "response": result}));
				res.send(JSON.stringify({"status":200, "error": null, "response": result}));
			})
			conn.release()
		}
	})
})




// find the groups the person subscribe to
app.get('/getgroups/:id', (req, res) => {

	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error fetching groups")
		} else {
			let query = "SELECT * FROM `groups` INNER JOIN groups_users ON groups_users.group_id = `groups`.group_id WHERE groups_users.user_id = " + req.params.id + ";"
			
				// get the groups id's for the groups the person subscribes to

			function initialize() {	
				return new Promise(function(resolve, reject) {
				     // Do async job
			        conn.query(query , (err, result, rows, fields) => {	
			            if (err) {
			                reject(err);
			            } else {
			                resolve(result);
			            }
			        })
			    })
			}
			

			initialize().then(result => {
				if(result.length === 0) {
					res.send(JSON.stringify({"status":200, "error": null, "response": result}))
	    			conn.release()
				} else {
					var itemsProcessed = 0;

					result.forEach((item, index, array) => {
					item.arr = []
						///husk på 'through group'
					  	conn.query("SELECT users.user_id, users.username, groups_users.group_id, sum(productdata.spend) spend FROM users INNER JOIN groups_users ON groups_users.user_id = users.user_id LEFT JOIN productdata ON productdata.`added_by` = users.user_id AND productdata.`through_group` = "+ item.group_id +" WHERE groups_users.group_id = "+ item.group_id +" group by users.user_id;" , (err, result2, rows, fields) => {
					    	itemsProcessed++;
					    	item.arr = result2
					    	if(itemsProcessed === array.length) {
					      		callback();
					    	}
					  	});
					});

					function callback () { 
		    			res.send(JSON.stringify({"status":200, "error": null, "response": result}))
		    			conn.release()
	    			}
    			}
	    	})

			    	
		}

		    	
	}) 

})

				
		




//get general list n shit
app.get('/getlist/:id', (req, res) => {

	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error fetching list of products")
		} else {
			let query = "SELECT users.user_id, users.username, groups_users.group_id FROM users INNER JOIN groups_users ON groups_users.user_id = users.user_id WHERE groups_users.group_id = " + req.params.id + ";"
			
				// get the groups id's for the groups the person subscribes to
			console.log(query)
			function initialize() {	
				return new Promise(function(resolve, reject) {
				     // Do async job
			        conn.query(query , (err, result, rows, fields) => {	
			            if (err) {
			                reject(err);
			            } else {
			                resolve(result);
			            }
			        })
			    })
			}
			

			initialize().then(result => {

				var itemsProcessed = 0;

				result.forEach((item, index, array) => {
				item.arr = []
				  	conn.query("SELECT id, name, spend FROM productdata WHERE productdata.`added_by` ="+ item.user_id + " AND productdata.`through_group` = "+ item.group_id + ";" , (err, result2, rows, fields) => {
				    	itemsProcessed++;
				    	item.arr = result2
				    	if(itemsProcessed === array.length) {
				      		callback();
				    	}
				  	});
				});

				function callback () { 
	    			res.send(JSON.stringify({"status":200, "error": null, "response": result}))
	    			conn.release()
    			}
	    	})

			    	
		}

		    	
	}) 

})
//check for specific products
app.get('/products/:serial/:id/:through_group', (req, res) => {
	console.log('fetching product with serial: ' + req.params.serial, "user who req:", req.params.id, "req through group:", req.params.through_group)
	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error 2")
		} else {
			//controll for missfires from front end
			if(/^\d+$/.test(req.params.serial)) {
				console.log("good string")
			conn.query("SELECT * FROM productdata WHERE serial = "+ req.params.serial +" AND `added_by` = "+req.params.id+"  OR serial = "+ req.params.serial + " AND `through_group` = "+ req.params.through_group +" ORDER  BY `added_by` = "+ req.params.id +" DESC LIMIT 1;", (err, result, rows, fields) => {
				if (result.length === 0 || result.length === undefined) {
					res.send(JSON.stringify({"status":404, "error": null, "response": [{id: "0", serial: req.params.serial, name: "...", pris: "...", spend: 0, added_by: req.params.id, through_group: 0}]}));
					console.log(result.length)
				} else {
					console.log(result);
					res.send(JSON.stringify({"status":200, "error": null, "response": result}));
				}
			})
			conn.release()
			} else{
				console.log("flawed string")
				res.end()
			}
		}
	})
})
//update existing / add new product
app.post('/update/:id', (req, res) => {
	console.log(req.body)
	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error 3")
		} else {
			if (req.params.id == 0) {
				console.log("hello look at me;",req.body)
				conn.query(`INSERT INTO productdata (serial, name, pris, spend, added_by, through_group) VALUES (${req.body.serial}, '${req.body.name}', ${req.body.price}, ${req.body.price}, ${req.body.added_by}, ${req.body.through_group});`
				, (err, result,) => {
					if (err) { 
						throw err;
					} else {
						console.log(result);
						res.send("success");
					}
				})
				
			} else {
				console.log(req.params, req.body)
				conn.query("UPDATE `productdata` SET `spend` = `spend` +" + req.body.price +", `pris` = " + req.body.price + "  WHERE `id` = " +req.params.id +" AND `added_by` = "+req.body.added_by+ " AND `through_group` = "+req.body.through_group+";", (err, result,) => {
					if (err) {
						throw err;
					} else {
						console.log(result, "okaaay...");
						res.send("success");
					}
				})
				
			}
		conn.release()
		}
	})

})
//get people for establishing new groups
app.get('/getpeople', (req, res) => {
	console.log('fetching people...: ')
	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error 4")
		} else {
			conn.query("Select users.user_id, users.username from users;", (err, result, rows, fields) => {
				if (result.length === 0) {
					res.send(JSON.stringify({"status":404, "error": null, "response": "Oops! har du registrert deg? husk store forbokstaver der de hører hjemme!"}));
					console.log(result.length)
				} else {
					console.log(result);
					res.send(JSON.stringify({"status":200, "error": null, "response": result}));
				}
			})
			conn.release()
		}
	})
})
//endpoint establishing group/ for adding relational data concerning groups
// takes to datapoints: "users" and "groupname"
app.post('/establishGroup', (req, res) => {
	console.log(req.body)
	pool.getConnection(function(err,conn) {
		if (err){
			res.send("error 4")
		} else {
			let query = "INSERT INTO `groups` (name) VALUES ('" + req.body.groupname + "');"
			
			function initialize() {	
				return new Promise(function(resolve, reject) {
				     // Do async job
			        conn.query(query , (err, result, rows, fields) => {	
			            if (err) {
			                reject(err);
			            } else {
			                resolve(result);
			            }
			        })
			    })
			}
			
			initialize().then(result => {
				console.log("group created:",result)
				
				var queriesMade = 0;
				
				req.body.users.forEach((user, index, array) => {
				
				  	conn.query(`call creategroup(${user}, '${req.body.groupname}');` , (err, result2, rows, fields) => {
				    	console.log(result2);
				    	queriesMade++;
						if(queriesMade === array.length) {
				      		callback();
				    	}
				  	});
				});
				function callback () { 
	    			res.send(JSON.stringify({"status":200, "error": null, "response": "all done!"}))
	    			conn.release()
    			}
			})
			
		}
	})
})

