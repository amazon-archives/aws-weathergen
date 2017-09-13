#!/bin/bash -e

. config

echo "Stack creation starting...."
aws cloudformation create-stack --stack-name $STACK_NAME --template-body file://stack.json --region $REGION

if [ $? -eq 0 ] 
then
  echo " - waiting for stack creation to complete"
  aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
  echo "Stack creation completed."
  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --output json | jq '.[][0].Outputs'

else 
  echo "Stack creation failed"
fi
