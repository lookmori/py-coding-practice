import UsersClient from "./UsersClient";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">用户管理</h1>
      <p className="text-sm text-th-text2 mb-6">管理平台所有用户，支持按角色过滤、创建用户、重置密码。</p>
      <UsersClient />
    </div>
  );
}
