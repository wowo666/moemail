import { createDb } from "@/lib/db"
import { users, apiKeys, userRoles } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"

export const runtime = "edge"

export async function GET() {
  try {
    const canAccess = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!canAccess) {
      return Response.json({ error: "权限不足" }, { status: 403 })
    }

    const db = createDb()
    const allUsers = await db.query.users.findMany({
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      }
    })

    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.userRoles[0]?.role.name || 'civilian'
    }))

    return Response.json({ users: formattedUsers })
  } catch (error) {
    console.error("Failed to get users:", error)
    return Response.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const canAccess = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!canAccess) {
      return Response.json({ error: "权限不足" }, { status: 403 })
    }

    const json = await request.json()
    const { searchText } = json as { searchText: string }

    if (!searchText) {
      return Response.json({ error: "请提供用户名或邮箱地址" }, { status: 400 })
    }

    const db = createDb()

    const user = await db.query.users.findFirst({
      where: searchText.includes('@') ? eq(users.email, searchText) : eq(users.username, searchText),
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return Response.json({ error: "未找到用户" }, { status: 404 })
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.userRoles[0]?.role.name || 'civilian'
      }
    })
  } catch (error) {
    console.error("Failed to find user:", error)
    return Response.json(
      { error: "查询用户失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const canAccess = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!canAccess) {
      return Response.json({ error: "权限不足" }, { status: 403 })
    }

    const json = await request.json()
    const { userId } = json as { userId: string }

    if (!userId) {
      return Response.json({ error: "请提供要删除的用户 ID" }, { status: 400 })
    }

    const db = createDb()

    // 检查目标用户是否是皇帝，防止越权删除管理员
    const targetUserRole = await db.query.userRoles.findFirst({
      where: eq(userRoles.userId, userId),
      with: {
        role: true
      }
    })

    if (targetUserRole?.role.name === 'emperor') {
      return Response.json({ error: "不能删除皇帝角色的用户" }, { status: 400 })
    }

    // 先删除该用户的 API Keys（防止数据库外键约束报错）
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId))

    // 删除用户本人，会级联删除 accounts, userRoles, emails, webhooks 等
    await db.delete(users).where(eq(users.id, userId))

    return Response.json({ success: true })
  } catch (error) {
    console.error("Failed to delete user:", error)
    return Response.json(
      { error: "删除用户失败" },
      { status: 500 }
    )
  }
} 