## Error Type
Build Error

## Error Message
Next.js can't recognize the exported `config` field in route. It mustn't be reexported.

## Build Output
./Documents/Dev/Stitch/stitch-run/middleware.ts:8:31
Next.js can't recognize the exported `config` field in route. It mustn't be reexported.
  6 |  */
  7 |
> 8 | export { proxy as middleware, config } from './src/proxy';
    |                               ^^^^^^
  9 |

The exported configuration object in a source file needs to have a very specific format from which some properties can be statically parsed at compiled-time.

https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

Next.js version: 16.0.6 (Turbopack)
