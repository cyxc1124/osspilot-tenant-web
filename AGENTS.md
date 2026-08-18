# osspilot-tenant-web

租户控制台。独立 Vite SPA，只吃 [osspilot-tenant-api](https://github.com/cyxc1124/osspilot-tenant-api)，不从其它仓 import 源码。

## 提交

`<type>: <中文说明>`，可加范围：`feat(auth): ...`。必须保留 type 前缀，不要只写中文。

- `feat` 新功能
- `fix` 修缺陷
- `docs` 文档
- `style` 格式（不影响行为）
- `refactor` 重构
- `perf` 性能
- `test` 测试
- `build` 构建与依赖
- `ci` CI / 工作流
- `chore` 脚手架、杂项
- `revert` 回滚

```
feat: 登录后强制跳转修改密码
fix: 关闭弹窗时清掉选中账号
docs: 扩充提交前缀
ci: 拆分检查并推镜像到 GHCR
chore: 从 monorepo 拆出本仓
```

## 发布

功能 PR 先合进 `develop`。要发版本时：`develop` 开 PR 到 `main`，合并后再打 annotated tag 并 push。不要在 `develop` 上直接打发行 tag。只改 CI Action 不用打 tag。

## 实现

- 对照 OssPilot `legacy/`（v0.6.0），不跟 API 每一片齐发。切流包：T1–T5。
- 本地 `VITE_TENANT_API_URL`；容器用 `OSSPILOT_API_URL` 写 `/config.json`，不必为换 API 地址重新 build。
- CI：Lint / Typecheck / Test / Build。镜像独立发布，不打进 API 镜像。
