# 使用官方 Node.js 20 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和依赖
COPY package*.json ./
RUN npm install --production

# 复制所有应用文件
COPY . .

# 创建上传目录（Fly.io Volume 会挂载到 /data）
RUN mkdir -p /data/uploads

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["npm", "start"]
