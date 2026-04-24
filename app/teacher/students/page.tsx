import StudentsClient from "./StudentsClient";

export default function TeacherStudentsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">学生管理</h1>
      <p className="text-sm text-th-text2 mb-6">管理本校学生，创建账号、重置密码或停用账号。</p>
      <StudentsClient />
    </div>
  );
}
