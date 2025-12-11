// API 配置
// 开发时：改成你电脑的局域网 IP（手机和电脑需在同一 WiFi）
// 生产时：改成服务器域名

// 获取你电脑 IP 的方法：
// Windows: 打开 CMD，输入 ipconfig，找到 IPv4 地址
// Mac/Linux: 打开终端，输入 ifconfig 或 ip addr

const isDev = import.meta.env.DEV;

// 开发环境配置
const DEV_CONFIG = {
  // 浏览器开发时用 localhost
  // Android模拟器使用 10.0.2.2 访问主机 localhost
  // 手机真机调试时改成你电脑的局域网 IP，例如：'http://192.168.1.100:3001'
  API_BASE_URL: 'http://10.0.2.2:3001',
};

// 生产环境配置
const PROD_CONFIG = {
  // 部署后改成你的服务器地址
  API_BASE_URL: 'https://your-server-domain.com',
};

export const config = isDev ? DEV_CONFIG : PROD_CONFIG;

// 导出 API 基础地址
export const API_BASE_URL = config.API_BASE_URL + '/api';
