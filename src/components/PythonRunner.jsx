import React, { useEffect, useRef, useState } from 'react';

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.mjs`;
const RUN_TIMEOUT_MS = 8000;

function makeWorker() {
  const source = `
    let pyodidePromise;
    async function getPyodide() {
      if (!pyodidePromise) {
        pyodidePromise = import('${PYODIDE_URL}').then(({ loadPyodide }) =>
          loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/' })
        );
      }
      return pyodidePromise;
    }

    self.onmessage = async (event) => {
      const { id, code, inputText } = event.data || {};
      try {
        const pyodide = await getPyodide();
        pyodide.globals.set('__portal_input_text', String(inputText || ''));
        const pythonProgram = [
          'import sys, io, builtins',
          '__portal_lines = __portal_input_text.splitlines()',
          '__portal_index = 0',
          '',
          'def __portal_input(prompt=\'\'):',
          '    global __portal_index',
          '    if prompt:',
          '        print(prompt, end=\'\')',
          '    if __portal_index >= len(__portal_lines):',
          '        raise EOFError(\'No more input values were provided.\')',
          '    value = __portal_lines[__portal_index]',
          '    __portal_index += 1',
          '    return value',
          '',
          'builtins.input = __portal_input',
          '__portal_out = io.StringIO()',
          '__portal_err = io.StringIO()',
          '_old_out, _old_err = sys.stdout, sys.stderr',
          'sys.stdout, sys.stderr = __portal_out, __portal_err',
          'try:',
          "    exec(compile(" + JSON.stringify(code) + ", '<student_code>', 'exec'), {})",
          'finally:',
          '    sys.stdout, sys.stderr = _old_out, _old_err',
          '(__portal_out.getvalue(), __portal_err.getvalue())',
        ].join('\n');
        const result = await pyodide.runPythonAsync(pythonProgram);
        const output = result?.toJs ? result.toJs() : result;
        const values = Array.isArray(output) ? output : [String(output || ''), ''];
        self.postMessage({ id, ok: true, stdout: values[0] || '', stderr: values[1] || '' });
      } catch (err) {
        self.postMessage({ id, ok: false, error: String(err?.message || err) });
      }
    };
  `;
  const blob = new Blob([source], { type: 'text/javascript' });
  return new Worker(URL.createObjectURL(blob), { type: 'module' });
}

export default function PythonRunner({ code, onChange }) {
  const [inputText, setInputText] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const runIdRef = useRef(0);

  useEffect(() => () => {
    if (workerRef.current) workerRef.current.terminate();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function runCode() {
    if (!code?.trim()) {
      setError('Enter Python code before running it.');
      setOutput('');
      return;
    }
    if (workerRef.current) workerRef.current.terminate();
    if (timerRef.current) clearTimeout(timerRef.current);

    const worker = makeWorker();
    const runId = ++runIdRef.current;
    workerRef.current = worker;
    setRunning(true);
    setError('');
    setOutput('Starting Python…');

    worker.onmessage = (event) => {
      if (runId !== runIdRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setRunning(false);
      if (event.data?.ok) {
        const combined = [event.data.stdout, event.data.stderr ? `\n${event.data.stderr}` : ''].join('').trimEnd();
        setOutput(combined || 'Program finished successfully with no output.');
        setError('');
      } else {
        setOutput('');
        setError(event.data?.error || 'Python execution failed.');
      }
      worker.terminate();
      workerRef.current = null;
    };
    worker.onerror = (event) => {
      if (runId !== runIdRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setRunning(false);
      setOutput('');
      setError(event.message || 'Python execution failed.');
      worker.terminate();
      workerRef.current = null;
    };
    worker.postMessage({ id: runId, code, inputText });
    timerRef.current = setTimeout(() => {
      if (runId !== runIdRef.current) return;
      worker.terminate();
      workerRef.current = null;
      setRunning(false);
      setOutput('');
      setError('Execution stopped because it exceeded 8 seconds. Check for an infinite loop or very large computation.');
    }, RUN_TIMEOUT_MS);
  }

  return (
    <div className="python-runner">
      <div className="python-editor-label">Python code</div>
      <textarea
        className="code-editor python-code-editor"
        spellCheck={false}
        value={code || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Python code editor"
      />
      <div className="python-runner-controls">
        <label>
          <span>Program input (one value per line, if required)</span>
          <textarea
            className="python-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={'Example:\n25\n40'}
          />
        </label>
        <button type="button" className="primary python-run-button" onClick={runCode} disabled={running}>
          {running ? 'Running…' : '▶ Run Python'}
        </button>
      </div>
      <div className="python-output-wrap">
        <div className="python-output-title">Output</div>
        <pre className="python-output" aria-live="polite">{output || 'Run your program to see the output here.'}</pre>
      </div>
      {error && <div className="python-run-error">{error}</div>}
      <p className="meta python-runner-note">Python runs locally in your browser. Code is not sent to the server just to execute it.</p>
    </div>
  );
}
