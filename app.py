# app.py
#
# A simple Flask web server to serve the Three.js application.

from flask import Flask, render_template

# Initialize the Flask application
app = Flask(__name__)


@app.route("/")
def index():
    """
    Serves the main HTML page of the application.
    """
    return render_template("index.html")


@app.route("/test")
def test():
    return render_template("test.html")


if __name__ == "__main__":
    # Run the app in debug mode, which allows for automatic reloading
    # when code changes are detected.
    app.run(debug=True)
