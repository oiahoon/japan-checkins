# GitHub 基础版：不用安装软件的私人旅行日志

每位用户都会有自己的源码仓库、Pages 网址和私有数据仓库，不共用作者的网站。

基础版使用 GitHub Pages 托管网页，Actions 只构建应用。**网页上传的照片与记录直接写进你选择的 private 数据仓库**，不会公开在 Pages，也不需要 Vercel 或数据库。

## 第一步：得到自己的网页

1. 在本项目右上角点 **Fork → Create fork**，创建自己的源码副本。源码可公开，因为它不包含旅行数据。
2. 打开副本的 **Actions**，若提示工作流未启用，点击启用。
3. 打开 **Settings → Pages**，在 **Build and deployment → Source** 选择 **GitHub Actions**。
4. 回到 **Actions → 发布 GitHub 基础版 → Run workflow → Run workflow**。
5. 工作流完成后点击 `github-pages` 部署链接，通常为 `https://你的用户名.github.io/源码仓库名/`。

后续源码 main 更新会重新构建；上传照片不需要重新构建。GitHub Free可在公开源码仓库使用Pages，私有源码的Pages取决于GitHub账号方案；**这里公开的只是源码，数据仓库始终保持private**。

## 第二步：建一个只放自己旅行数据的仓库

打开 [创建仓库](https://github.com/new)，名称例如 `my-travel-data`，选 **Private**，勾选 **Add a README file**，点击创建。不要在这个仓库启用Pages，不要把照片放进公开的源码副本。

## 第三步：给网页一把只访问这个仓库的钥匙

打开 [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new)：

1. 写一个能认出的名称，例如“我的旅行日志”，设置有效期。
2. Resource owner 选自己；Repository access 选 **Only select repositories**，只勾选刚创建的数据仓库。
3. Repository permissions 中把 **Contents** 设成 **Read and write**，其他权限保持默认。
4. 创建并复制令牌。组织仓库可能还需组织批准。

不要使用能访问全部私人仓库的广泛令牌，不要把令牌发给别人、填进Actions Secrets或提交到源码。网页只向 `https://api.github.com` 的这个仓库发送令牌。

## 第四步：连接与上传

在自己的旅行网页填写：

- 私有数据仓库：`用户名/my-travel-data`。
- 连接令牌：刚复制的令牌。
- 默认分支 `main`；如果你修改过分支，可在“首次连接怎么准备”中调整。

点 **连接私人日志**。连接会核实仓库私有、分支存在和日志所有权，之后进入照片库。点添加照片，照片立即独立保存；日期 / GPS有EXIF则提供建议，没有则手填。明确保存地点 / 日期后才会标记地图。照片可单张 / 批量加入旅行记录，时间线、查看器、回收恢复、照片拼图和地图导出沿用同一套设计。

## 为什么刷新还要连接

令牌只留在当前网页内存，不放在地址栏、Cookie、localStorage、源码、Pages或Actions。断开连接会取消请求并撤销临时照片URL；刷新 / 关闭页面后需要重新输入。仓库和已保存旅行记录不会丢失。

这是由GitHub API验证权限的私人数据访问，不是用前端密码遮住公开照片。网页壳可以公开，未授权访问者看不到你的数据。请只在自己信任的源码副本和HTTPS网页中输入凭据，保持依赖与代码来源可信。

clone 到本机再 push 到新建源码仓库也可以，随后执行同样的 Actions / Pages 步骤。单纯 clone 或 fork 不能代替 Pages 启用和私人数据授权；不存在零配置的私人网页上传。

如果想用更简单的密码登录、长会话、独立只读访问密码、公开投影或可选在线地点搜索，可以选择 [Vercel进阶版](SELF-HOSTING.md)。同一份私有数据格式可复用，不需要导出重传；已有owner须保持一致。

## 常见问题

| 现象 | 解决 |
| --- | --- |
| Actions没开始 / Pages没地址 | 启用fork工作流，Pages Source选择GitHub Actions，再手动运行发布 |
| 页面空白、地图404 | 不要改构建中的BASIC_BASE_PATH；使用含源码仓库名的完整部署地址 |
| 仓库连不上 | 核对拼写、private、README与main、token有效期和选中仓库、组织批准 |
| 能看但不能保存 | token需要Contents写权限，数据分支保护须允许直接提交 |
| GitHub连接不稳定 | 保留页面内容后重试，不重复新建照片；保存与上传ID保持幂等 |
| 照片没有GPS / 日期 | 可能原图没有或格式无法读取，可补充；不会用东京或上传日期猜旅行 |
| 令牌过期 | 重新创建受限token并连接，数据仍在原私有仓库 |

基础版不提供共享网页密码、独立访客角色或公开记录发布，不会把私有数据打包成静态网站。索引512KiB、单张处理后JPEG3MiB、相册100张，适合个人日志。大量照片的GitHub接口延迟 / 配额、具体HEIC/RAW机型和手机系统分享仍需单独验收，不能承诺所有文件与设备兼容。

官方依据：[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[REST API跨域访问](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)。
