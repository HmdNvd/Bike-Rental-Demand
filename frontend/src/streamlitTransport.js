import { Streamlit } from 'streamlit-component-lib';

let args;
let boot;
const ready = new Promise(resolve => { boot = resolve; });
const pending = new Map();

Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, event => {
  args = event.detail.args;
  boot();
  const response = args.response;
  const request = response && pending.get(response.id);
  if (request) {
    pending.delete(response.id);
    request.cleanup();
    if (response.error) request.reject(new Error(response.error));
    else request.resolve(response.result);
  }
});
Streamlit.setComponentReady();
Streamlit.setFrameHeight(1100);
document.documentElement.classList.add('streamlit-embedded');
new ResizeObserver(() => {
  requestAnimationFrame(() => Streamlit.setFrameHeight(Math.ceil(document.body.getBoundingClientRect().height)));
}).observe(document.body);

export async function cloudApi(path, options = {}) {
  await ready;
  if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
  if (path === 'model') return args.model;
  if (path === 'scenarios') return args.scenarios;
  if (path !== 'predict') throw new Error('Unsupported prediction operation.');
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const abort = () => { pending.delete(id); reject(new DOMException('Request aborted', 'AbortError')); };
    options.signal?.addEventListener('abort', abort, { once: true });
    pending.set(id, { resolve, reject, cleanup: () => options.signal?.removeEventListener('abort', abort) });
    Streamlit.setComponentValue({ id, inputs: JSON.parse(options.body) });
  });
}
