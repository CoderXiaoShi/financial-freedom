import EventEmitter from "node:events";

const bus = new EventEmitter();
bus.setMaxListeners(50);

/**
 * 服务端广播事件总线。
 * SSE 端点监听 bus，/sms 等路由通过 bus 推送消息。
 */
export { bus };
