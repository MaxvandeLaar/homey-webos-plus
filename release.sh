#!/bin/bash

version=`jq '.version' app.json -r`
webosName=webos-plus-v$version

rootDir=./dist
distDir=$rootDir/$webosName/

npm install
rm -rf $rootDir
mkdir -p $distDir
cp -rf ./assets ./drivers ./locales ./node_modules $distDir
cp ./app.js ./app.json .homeychangelog.json ./LICENSE ./package.json ./package-lock.json ./README.md README.txt README.nl.txt $distDir

cd $rootDir && zip -r $webosName.zip ./$webosName
