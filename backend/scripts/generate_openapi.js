// Simple OpenAPI generator from Prisma schema (very small parser)
const fs = require('fs');
const path = require('path');
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const outPath = path.join(__dirname, '../openapi.generated.json');
const src = fs.readFileSync(schemaPath, 'utf8');

function parseModels(src) {
  const models = {};
  const regex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = regex.exec(src))) {
    const name = m[1];
    const body = m[2];
    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@'));
    const fields = [];
    for (const line of lines) {
      // skip directives
      if (line.startsWith('@@') || line.startsWith('@@index') || line.startsWith('@@unique')) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const fname = parts[0];
      const ftype = parts[1];
      // ignore relation fields that have @relation inline? still include
      fields.push({ name: fname, type: ftype });
    }
    models[name] = fields;
  }
  return models;
}

function prismaTypeToOpenAPI(ptype) {
  const nullable = ptype.endsWith('?');
  const raw = nullable ? ptype.slice(0, -1) : ptype;
  const map = {
    'String': { type: 'string' },
    'Int': { type: 'integer' },
    'Boolean': { type: 'boolean' },
    'DateTime': { type: 'string', format: 'date-time' },
    'Json': { type: 'object' }
  };
  if (map[raw]) return { schema: map[raw], nullable };
  // enums and relations -> treat as string id
  return { schema: { type: 'string' }, nullable };
}

const models = parseModels(src);
const components = { schemas: {} };
for (const [name, fields] of Object.entries(models)) {
  const schema = { type: 'object', properties: {}, required: [] };
  for (const f of fields) {
    const conv = prismaTypeToOpenAPI(f.type);
    schema.properties[f.name] = conv.schema;
    if (!conv.nullable) schema.required.push(f.name);
  }
  if (schema.required.length === 0) delete schema.required;
  components.schemas[name] = schema;
}

const paths = {};
for (const name of Object.keys(models)) {
  const base = '/' + name.toLowerCase() + 's';
  paths[base] = {
    get: { summary: `List ${name}`, responses: { '200': { description: 'OK' } } },
    post: { summary: `Create ${name}`, requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } }, responses: { '201': { description: 'Created' } } }
  };
  paths[base + '/{id}'] = {
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    get: { responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
    put: { requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } }, responses: { '200': { description: 'OK' } } },
    delete: { responses: { '204': { description: 'No content' } } }
  };
}

const openapi = {
  openapi: '3.0.1',
  info: { title: 'SkullKing API (generated)', version: '0.1.0' },
  servers: [{ url: 'http://localhost:3001/api/v1' }],
  components,
  paths
};

fs.writeFileSync(outPath, JSON.stringify(openapi, null, 2));
console.log('Wrote', outPath);
