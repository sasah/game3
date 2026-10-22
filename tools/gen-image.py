#!/usr/bin/env python3
"""Generate illustrations with the OpenAI Images API (development-time only; never ship the key).

Usage:
  python3 tools/gen-image.py --batch docs/art/style-test.json --out prototypes/styles/img
  python3 tools/gen-image.py --prompt "..." --size 1536x1024 --out-file path.webp

Reads OPENAI_API_KEY from the environment. If it is unset, the request is sent without an
Authorization header (an egress proxy may inject credentials). Picks the newest available
gpt-image model unless --model is given. Writes .webp (alpha kept) via Pillow when the name
ends in .webp, otherwise the raw PNG. Appends one JSON line per image to <out>/log.jsonl.
"""
import argparse, base64, io, json, os, sys, time, urllib.request, urllib.error

API = 'https://api.openai.com/v1'
PREFERRED = ['gpt-image-2.5', 'gpt-image-2', 'gpt-image-1.5', 'gpt-image-1']


def request(method, path, body=None):
    headers = {'Content-Type': 'application/json'}
    key = os.environ.get('OPENAI_API_KEY')
    if key:
        headers['Authorization'] = 'Bearer ' + key
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{e.code} {e.read().decode(errors="replace")[:800]}') from None


def pick_model():
    ids = sorted(m['id'] for m in request('GET', '/models')['data'] if m['id'].startswith('gpt-image'))
    for p in PREFERRED:
        # Prefer an exact family match, then any variant of it (e.g. dated or suffixed ids).
        exact = [i for i in ids if i == p]
        variants = [i for i in ids if i.startswith(p + '-') or i.startswith(p + '.')]
        if exact or variants:
            return (exact or sorted(variants))[0], ids
    if ids:
        return ids[-1], ids
    raise RuntimeError('no gpt-image model available to this key')


def generate(model, prompt, size, quality, transparent):
    body = {'model': model, 'prompt': prompt, 'size': size, 'quality': quality, 'n': 1}
    if transparent:
        body['background'] = 'transparent'
        body['output_format'] = 'png'
    try:
        res = request('POST', '/images/generations', body)
    except RuntimeError as e:
        if transparent and ('background' in str(e) or 'output_format' in str(e)):
            print('  transparent background not supported, retrying opaque', file=sys.stderr)
            body.pop('background'); body.pop('output_format')
            res = request('POST', '/images/generations', body)
        else:
            raise
    return base64.b64decode(res['data'][0]['b64_json']), res.get('usage')


def save(png, path):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    if path.endswith('.webp'):
        from PIL import Image
        img = Image.open(io.BytesIO(png))
        img.save(path, 'WEBP', quality=86, method=6)
    else:
        with open(path, 'wb') as f:
            f.write(png)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--batch')
    ap.add_argument('--out', default='.')
    ap.add_argument('--prompt')
    ap.add_argument('--out-file')
    ap.add_argument('--size', default='1536x1024')
    ap.add_argument('--quality', default='high')
    ap.add_argument('--transparent', action='store_true')
    ap.add_argument('--model')
    ap.add_argument('--only', help='comma-separated ids from the batch')
    ap.add_argument('--skip-existing', action='store_true')
    a = ap.parse_args()

    model = a.model
    if not model:
        model, ids = pick_model()
        print(f'models available: {", ".join(ids)}\nusing: {model}')

    jobs = []
    if a.batch:
        spec = json.load(open(a.batch))
        only = set(a.only.split(',')) if a.only else None
        for j in spec['images']:
            if only and j['id'] not in only:
                continue
            style = spec['styles'][j['style']]
            subject = spec['subjects'][j['subject']]
            prompt = subject['prompt'].strip() + '\n\nSTYLE: ' + style.strip() + '\n\n' + spec.get('rules', '').strip()
            jobs.append({
                'id': j['id'], 'prompt': prompt, 'size': subject.get('size', a.size),
                'transparent': subject.get('transparent', False),
                'path': os.path.join(a.out, j['id'] + '.webp'),
            })
    else:
        jobs.append({'id': 'single', 'prompt': a.prompt, 'size': a.size, 'transparent': a.transparent,
                     'path': a.out_file or os.path.join(a.out, 'image.webp')})

    os.makedirs(a.out, exist_ok=True)
    log = open(os.path.join(a.out, 'log.jsonl'), 'a')
    failed = 0
    for j in jobs:
        if a.skip_existing and os.path.exists(j['path']):
            print(f'skip {j["id"]}')
            continue
        t0 = time.time()
        print(f'gen {j["id"]} {j["size"]}{" transparent" if j["transparent"] else ""} ...', flush=True)
        try:
            png, usage = generate(model, j['prompt'], j['size'], a.quality, j['transparent'])
            save(png, j['path'])
            dt = time.time() - t0
            print(f'  ok {j["path"]} {os.path.getsize(j["path"]) // 1024} KB {dt:.0f}s usage={usage}')
            log.write(json.dumps({'id': j['id'], 'model': model, 'quality': a.quality, 'size': j['size'],
                                  'seconds': round(dt), 'usage': usage, 'prompt': j['prompt']}, ensure_ascii=False) + '\n')
            log.flush()
        except Exception as e:  # keep going; report at the end
            failed += 1
            print(f'  FAILED {j["id"]}: {e}', file=sys.stderr)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
