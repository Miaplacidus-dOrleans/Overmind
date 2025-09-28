// 让 import "settings" 指向 fork 提供的默认设置
export * from './settings.default';
export { default } from './settings.default'; // 保险起见，若有 default 也转发
