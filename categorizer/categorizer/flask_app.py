from flask import Flask, Response, request
import subprocess

app = Flask(__name__)

@app.route('/categorize', methods=['POST'])
def categorize():
    if request.method == 'POST':
        process = subprocess.Popen(['python', 'mysite/categorize.py'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

        def generate_output():
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    yield output.rstrip() + '\n'

        return Response(generate_output(), mimetype='text/plain')
    else:
        return 'Invalid request method', 405