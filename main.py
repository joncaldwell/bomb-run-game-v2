from flask import Flask, render_template
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'dev_key_for_session'  # For development only

@app.route('/')
def index():
    logger.debug("Serving index page")
    return render_template('index.html')

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)