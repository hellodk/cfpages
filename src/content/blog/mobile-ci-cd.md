---
title: "How to achieve CI CD on Mobile Applications"
date: 2023-03-16
description: "Dynamic instrumentation is the technique to tweak the application at runtime and analyze the application behaviour."
tags: [ci-cd, mobile, android, ios]
draft: false
---

##### Let’s take a stroll over the different terminologies we may come across during our journey of Mobile CI CD

-   Dynamic Instrumentation

Dynamic instrumentation is the technique to tweak the application at runtime and analyze the application behaviour.

This application tweaking is done through the injection of instrumentation code. Essentially we are allowed to execute our debug scripts inside another process.

They are mainly two different types of instrumentation - Embedded, and injection Embedded instrumentation can be done by patching the binary application with our instrumentation agent in the form of a shared library, dll, and dylib Whereas injection will spawn the instrumentation agent as a process and will inject into the runtime environment like Android Zygote. The main reason to choose one over another is that only embedded can successfully run in a jailed environment

There are mutilple tools that canbe used for dynamic instrumentation:

1.  Frida
