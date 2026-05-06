import json

SAFE_BUILTINS = {
    "True": True, "False": False, "None": None,
    "int": int, "float": float, "str": str, "bool": bool,
    "len": len, "range": range, "enumerate": enumerate,
    "list": list, "dict": dict, "set": set, "tuple": tuple,
    "print": print, "isinstance": isinstance,
    "json": json,
}


class ScriptResponse:
    def __init__(self, data):
        self._data = data or {}
        self.status_code = self._data.get("status_code", 0)
        self.headers = self._data.get("headers", {})
        self.text = self._data.get("body", "")
        self._body = self._data.get("body", "")

    def json(self):
        try:
            return json.loads(self._body)
        except (json.JSONDecodeError, TypeError):
            return None


class ScriptRequest:
    def __init__(self, data):
        self._data = data or {}
        self.url = self._data.get("url", "")
        self.method = self._data.get("method", "GET")
        self.headers = self._data.get("headers", {})
        self.body = self._data.get("body", "")


class ScriptContext:
    def __init__(self, request_data=None, response_data=None):
        self._request = ScriptRequest(request_data)
        self._response = ScriptResponse(response_data)
        self._extracted_vars = {}
        self._output = []

    @property
    def request(self):
        return self._request

    @property
    def response(self):
        return self._response

    def extract_var(self, key, value):
        self._extracted_vars[key] = value

    def env(self, key, default=None):
        env_vars = self._request._data.get("env_vars", {})
        return env_vars.get(key, default)

    def log(self, *args):
        self._output.append(" ".join(str(a) for a in args))


def run_script(script_text, context, script_type="pre"):
    if not script_text or not script_text.strip():
        return {}, None

    ctx = ScriptContext(context.get("request"), context.get("response"))
    local_vars = {
        "ctx": ctx,
        "response": ctx.response,
        "request": ctx.request,
        "extract_var": ctx.extract_var,
        "env": ctx.env,
        "log": ctx.log,
    }

    try:
        exec(script_text, {"__builtins__": SAFE_BUILTINS, **local_vars})
    except Exception as e:
        return {"error": str(e)}, f"[{script_type}-script error] {e}"

    output = "\n".join(ctx._output) if ctx._output else None

    clean_vars = {}
    for k, v in ctx._extracted_vars.items():
        if isinstance(v, (str, int, float, bool, type(None))):
            clean_vars[k] = v
        else:
            clean_vars[k] = json.dumps(v) if not isinstance(v, str) else v

    return clean_vars, output
