---
title: "Using Operators"
date: 2021-12-07
description: "Verify the Operator SDK Version: -------------------------------- operator-sdk version"
tags: [kubernetes, operators]
draft: true
---

Install the operator:
---------------------
yum update -y
yum install -y gcc make go
git clone https://github.com/operator-framework/operator-sdk
cd operator-sdk
git checkout master
make install

Verify the Operator SDK Version:
--------------------------------
operator-sdk version

If the command is not found, we may need to set the PATH

mkdir -p $GOPATH/src/operators && cd $GOPATH/src/operators
minikube start init
operator-sdk init

operator-sdk create api --version=v1alpha1 --kind=Traveller

go mod tidy
go mod vendor



Deploy CRD Instance:
--------------------
kustomize build config/samples | kubectl apply -f -
make run

kubectl get all



------------------------------



mkdir sample-operator
cd sample-operator
operator-sdk init --domain hellodk --repo github.com/hellodk/sample-operator

operator-sdk create api --group cache --version v1alpha1 --kind Hellodk --resource --controller

make docker-build docker-push IMG="hellodk/sample-operator:v0.0.1"

make bundle IMG="hellodk/sample-operator:v0.0.1"
make bundle-build bundle-push

operator-sdk run bundle hellodk/sample-operator-bundle:v0.0.1

make generate

operator-sdk generate crds
operator-sdk generate k8s
