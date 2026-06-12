import { createDb } from "@/lib/db"
import { users } from "@/lib/schema"
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