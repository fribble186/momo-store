/**
 * Description: 
 * 简单的数据持久化
 * 使用最传统的mvc模式，使用hook触发通知页面更新
 * easy model模式，会监听model属性的变化，一变化就会刷新页面
 * 
 * Author: fribble
 * Date: 2020/12/7
 */


import React from 'react'
const { useState, useEffect } = require("react")

// utils层
const isFunction = fn => typeof fn === 'function';
const isObject = o => Object.prototype.toString.call(o) === '[object Object]';
const isPromise = fn => { if (fn instanceof Promise) return true; return isObject(fn) && isFunction(fn.then); };
// setState队列方法
const subscribe = (key, cb) => {
  if (!Queue[key]) Queue[key] = [];
  Queue[key].push(cb);
};
const Esubscribe = (key, cb) => {
  if (!EQueue[key]) EQueue[key] = [];
  EQueue[key].push(cb);
};
const unSubscribe = (key, cb) => {
  if (!Queue[key]) return;
  const index = Queue[key].indexOf(cb);
  if (index !== -1) Queue[key].splice(index, 1);
};
const EunSubscribe = (key, cb) => {
  if (!EQueue[key]) return;
  const index = EQueue[key].indexOf(cb);
  if (index !== -1) EQueue[key].splice(index, 1);
};
const broadcast = key => {
  if (!Queue[key]) return
  Queue[key].forEach(fn => fn(Math.random()))
}
const Ebrodcast = key => {
  if (!EQueue[key]) return
  EQueue[key].forEach(fn => fn(Math.random()))
}
const hook = key => {
  // eslint-disable-next-line
  const [, setState] = useState()
  // eslint-disable-next-line
  useEffect(() => {
    subscribe(key, setState)
    return () => unSubscribe(key, setState)
  })
}
const Ehook = key => {
  // eslint-disable-next-line
  const [, setState] = useState()
  // eslint-disable-next-line
  useEffect(() => {
    Esubscribe(key, setState)
    return () => EunSubscribe(key, setState)
  })
}
// 持久化层
const stores = {}
const Store = new Proxy({}, {
  get(_, key) {
    if (!stores[key]) return null
    hook(key)
    return stores[key]
  }
})
const estores = {}
const EStore = new Proxy({}, {
  get(_, key) {
    if (!estores[key]) return null
    Ehook(key)
    return estores[key]
  }
})
const Queue = {}
const EQueue = {}
// model层，建立model
export function onModel({ key, ...rest }) {
  let service
  let reducers = {}
  let state = { key }
  for (let rest_key in rest) {
    if (isFunction(rest[rest_key])) {
      reducers[rest_key] = rest[rest_key]
    } else {
      state[rest_key] = rest[rest_key]
    }
  }
  service = { ...state }
  for (let reducer_key in reducers) {
    service[reducer_key] = (...args) => {
      let promise = reducers[reducer_key].apply(service, args);
      if (!isPromise(promise)) {
        broadcast(key, Math.random())
        return promise
      }
      return new Promise((resolve, reject) => {
        promise
          .then(args => resolve(args))
          .catch(reject)
          .finally(() => {
            broadcast(key, Math.random())
          });
      });
    }
  }
  stores[key] = service
  return service
}
// view层，使用model
export function onView() {
  return Store
}
// controller层，可以对使用的model做一些特殊修改
function onController({ key, ...rest }) {
  // TODOS
}
// easy model类装饰器，里面只能有类属性，不能有类方法
export function createEModel({ key, ...property }) {
  if (estores[key]) return estores[key]
  Object.keys(property).forEach(key => {
    if (isFunction(property[key])) throw new Error("NOT ALLOW USE METHOD IN EASY MODEL")
  })
  const handler = {
    set: (target, name, value) => {
      target[name] = value
      Ebrodcast(key)
      return Reflect.set(target, key, value)
    }
  }
  estores[key] = new Proxy({ ...property }, handler)
  return estores[key]
}
// 使用easy model类
export function useEModel() {
  return EStore
}

// DEMO
// onModel({
//   key: "test",
//   test: 1,
//   change: function (v) { this.test = v }
// })
// createEModel({
//   key: "test",
//   test: 1
// })