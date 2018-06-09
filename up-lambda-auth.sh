cd lambda-auth
zip -r ../lambda-auth.zip *
cd ..
aws lambda update-function-code --function-name my-react --zip-file fileb://lambda-auth.zip
rm lambda-auth.zip
