import type {HttpMethod,KeyValue} from '@/lib/types/api';

interface RequestInfo {
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  body: string;
}

export function generateCurl(req: RequestInfo): string {
  let cmd = `curl -X ${req.method} '${req.url}'`;
  req.headers.filter(h => h.enabled && h.key).forEach(h => {
    cmd += ` \\\n  -H '${h.key}: ${h.value}'`;
  });
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    cmd += ` \\\n  -d '${req.body.replace(/'/g, "\\'")}'`;
  }
  return cmd;
}

export function generateJavaScript(req: RequestInfo): string {
  const activeHeaders = req.headers.filter(h => h.enabled && h.key);
  let code = `const response = await fetch('${req.url}', {\n`;
  code += `  method: '${req.method}',\n`;
  if (activeHeaders.length > 0) {
    const hObj: Record<string, string> = {};
    activeHeaders.forEach(h => { hObj[h.key] = h.value; });
    code += `  headers: ${JSON.stringify(hObj, null, 4).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n')},\n`;
  }
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    code += `  body: JSON.stringify(${req.body}),\n`;
  }
  code += `});\n\nconst data = await response.json();\nconsole.log(data);`;
  return code;
}

export function generatePython(req: RequestInfo): string {
  const activeHeaders = req.headers.filter(h => h.enabled && h.key);
  let code = `import requests\n\n`;
  code += `url = '${req.url}'\n`;
  if (activeHeaders.length > 0) {
    const hObj: Record<string, string> = {};
    activeHeaders.forEach(h => { hObj[h.key] = h.value; });
    code += `headers = ${JSON.stringify(hObj, null, 4)}\n`;
  }
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    code += `data = ${req.body}\n\n`;
    code += `response = requests.${req.method.toLowerCase()}(url${activeHeaders.length ? ', headers=headers' : ''}, json=data)\n`;
  } else {
    code += `\nresponse = requests.${req.method.toLowerCase()}(url${activeHeaders.length ? ', headers=headers' : ''})\n`;
  }
  code += `print(response.status_code)\nprint(response.json())`;
  return code;
}

export function generateNode(req: RequestInfo): string {
  const activeHeaders = req.headers.filter(h => h.enabled && h.key);
  let code = `const axios = require('axios');\n\n`;
  code += `const config = {\n`;
  code += `  method: '${req.method.toLowerCase()}',\n`;
  code += `  url: '${req.url}',\n`;
  if (activeHeaders.length > 0) {
    const hObj: Record<string, string> = {};
    activeHeaders.forEach(h => { hObj[h.key] = h.value; });
    code += `  headers: ${JSON.stringify(hObj, null, 4).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n')},\n`;
  }
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    code += `  data: ${req.body},\n`;
  }
  code += `};\n\n`;
  code += `const response = await axios(config);\nconsole.log(response.data);`;
  return code;
}
