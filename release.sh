#!/bin/bash

version=`jq '.version' app.json -r`
webosName=homey-webos-plus-v$version

rootDir=./dist
distDir=$rootDir/$webosName/

npm install
rm -rf $rootDir
mkdir -p $distDir
cp -rf ./assets ./drivers ./locales $distDir
cp ./app.js ./app.json .homeychangelog.json ./LICENSE ./package.json ./package-lock.json ./README.md README.txt README.nl.txt $distDir

cd $distDir
npm install --prod=only

cd ../ && zip -r $webosName.zip ./$webosName
