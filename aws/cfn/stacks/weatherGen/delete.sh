#!/bin/bash

. config

echo "Deleting cloudformation stack "$STACK_NAME
aws cloudformation delete-stack --stack-name $STACK_NAME 

if [ $? -eq 0 ] 
then
  echo " - waiting for deletion to complete"
  aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
fi
