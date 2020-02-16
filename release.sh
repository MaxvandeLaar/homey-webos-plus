#!/bin/bash

npm install
rm -rf ./build
mkdir ./build
cp -rf ./assets ./drivers ./locales ./node_modules ./build/
cp ./app.js ./app.json .homeychangelog.json ./LICENSE ./package.json ./package-lock.json ./README.md README.txt README.nl.txt ./build/

zip -r webos-plus.zip ./build
