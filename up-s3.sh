#!/usr/bin/env bash
cd s3
babel index.jsx > index.js
aws s3 sync . s3://marciogh.com/my-react/ --cache-control no-cache --acl public-read --delete
