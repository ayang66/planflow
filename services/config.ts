// API 配置
// 开发时：改成你电脑的局域网 IP（手机和电脑需在同一 WiFi）
// 生产时：改成服务器域名

// 获取你电脑 IP 的方法：
// Windows: 打开 CMD，输入 ipconfig，找到 IPv4 地址
// Mac/Linux: 打开终端，输入 ifconfig 或 ip addr

// iOS 模拟器用 localhost 或 127.0.0.1
// Android 模拟器用 10.0.2.2 访问主机
// 真机调试改成你电脑的局域网 IP
// 部署后改成服务器地址
export const config = {
  API_BASE_URL: 'https://planflow-xjjc.onrender.com',
};

// 导出 API 基础地址
export const API_BASE_URL = config.API_BASE_URL + '/api';
