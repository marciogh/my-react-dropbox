cd lambda-share
zip -r ../lambda-share.zip *
cd ..
aws lambda update-function-code --function-name my-react-share --zip-file fileb://lambda-share.zip
rm lambda-share.zip
