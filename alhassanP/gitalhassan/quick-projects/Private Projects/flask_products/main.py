from flask import Flask, render_template
import sqlite3 
import json

app = Flask(__name__)
connection = sqlite3.connect("data.sqlite") 

data_query = connection.execute("select * from products limit 10 ")  
data_array =data_query.fetchall()
connection.close()  


@app.route("/home")
@app.route("/")
def home():
    return render_template("index.html",data_array=data_array, json=json)


if __name__ == "__main__":
    app.run(debug=True)