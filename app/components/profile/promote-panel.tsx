"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Gem, Sword, User2, Loader2, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { ROLES, Role } from "@/lib/permissions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const roleIcons = {
  [ROLES.DUKE]: Gem,
  [ROLES.KNIGHT]: Sword,
  [ROLES.CIVILIAN]: User2,
} as const

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>

export function PromotePanel() {
  const t = useTranslations("profile.promote")
  const tCard = useTranslations("profile.card")
  const [searchText, setSearchText] = useState("")
  const [loading, setLoading] = useState(false)
  const [targetRole, setTargetRole] = useState<RoleWithoutEmperor>(ROLES.KNIGHT)
  const [usersList, setUsersList] = useState<any[]>([])
  const { toast } = useToast()
  
  const roleNames = {
    [ROLES.DUKE]: tCard("roles.DUKE"),
    [ROLES.KNIGHT]: tCard("roles.KNIGHT"),
    [ROLES.CIVILIAN]: tCard("roles.CIVILIAN"),
  } as const

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/roles/users")
      if (res.ok) {
        const data = await res.json() as { users: any[] }
        // Filter out Emperor from regular management list if preferred, but keeping all users is fine
        // since Emperor cannot be changed by design
        setUsersList(data.users || [])
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (userId: string, userIdentifier: string) => {
    if (!window.confirm(`确定要彻底删除用户 "${userIdentifier}" 吗？此操作将清除该用户所有的临时邮箱、邮件及配置，且不可恢复！`)) {
      return
    }

    try {
      const res = await fetch("/api/roles/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })

      if (!res.ok) {
        const error = await res.json() as { error: string }
        throw new Error(error.error || "删除失败")
      }

      toast({
        title: "用户删除成功",
        description: `已成功删除用户: ${userIdentifier}`,
      })
      fetchUsers()
    } catch (error) {
      toast({
        title: "删除用户失败",
        description: error instanceof Error ? error.message : "删除失败",
        variant: "destructive"
      })
    }
  }

  const handleAction = async () => {
    if (!searchText) return

    setLoading(true)
    try {
      const res = await fetch("/api/roles/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText })
      })
      const data = await res.json() as {
        user?: {
          id: string
          name?: string
          username?: string
          email: string
          role?: string
        }
        error?: string
      }

      if (!res.ok) throw new Error(data.error || "未知错误")

      if (!data.user) {
        toast({
          title: t("noUsers"),
          description: t("searchPlaceholder"),
          variant: "destructive"
        })
        return
      }

      if (data.user.role === targetRole) {
        toast({
          title: t("updateSuccess"),
          description: t("updateSuccess"),
        })
        return
      }

      const promoteRes = await fetch("/api/roles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          roleName: targetRole
        })
      })

      if (!promoteRes.ok) {
        const error = await promoteRes.json() as { error: string }
        throw new Error(error.error || t("updateFailed"))
      }

      toast({
        title: t("updateSuccess"),
        description: `${data.user.username || data.user.email} - ${roleNames[targetRole]}`,
      })
      setSearchText("")
      fetchUsers()
    } catch (error) {
      toast({
        title: t("updateFailed"),
        description: error instanceof Error ? error.message : t("updateFailed"),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const Icon = roleIcons[targetRole]

  return (
    <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("title")}</h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <Select value={targetRole} onValueChange={(value) => setTargetRole(value as RoleWithoutEmperor)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLES.DUKE}>
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4" />
                  {roleNames[ROLES.DUKE]}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.KNIGHT}>
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  {roleNames[ROLES.KNIGHT]}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.CIVILIAN}>
                <div className="flex items-center gap-2">
                  <User2 className="w-4 h-4" />
                  {roleNames[ROLES.CIVILIAN]}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAction}
          disabled={loading || !searchText.trim()}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `${t("promote")} ${roleNames[targetRole]}`
          )}
        </Button>

        {/* 用户列表 */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-semibold mb-3">已注册用户列表</h3>
          {usersList.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noUsers")}</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {usersList.map((usr) => {
                const isEmperor = usr.role === 'emperor'
                const displayRole = isEmperor ? tCard("roles.EMPEROR") : roleNames[usr.role as RoleWithoutEmperor] || usr.role
                
                return (
                  <div key={usr.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="min-w-0 flex-1 mr-4">
                      <div className="font-medium text-sm truncate">{usr.username || usr.name || 'Unnamed'}</div>
                      <div className="text-xs text-muted-foreground truncate">{usr.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isEmperor ? (
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded font-medium">
                          {displayRole}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select 
                            value={usr.role} 
                            onValueChange={async (newRole) => {
                              if (usr.role === newRole) return
                              try {
                                const promoteRes = await fetch("/api/roles/promote", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    userId: usr.id,
                                    roleName: newRole
                                  })
                                })
                                if (!promoteRes.ok) {
                                  throw new Error("更新失败")
                                }
                                toast({
                                  title: t("updateSuccess"),
                                  description: `${usr.username || usr.email} -> ${roleNames[newRole as RoleWithoutEmperor]}`
                                })
                                fetchUsers()
                              } catch {
                                toast({
                                  title: t("updateFailed"),
                                  variant: "destructive"
                                })
                              }
                            }}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ROLES.DUKE}>
                                <span className="flex items-center gap-1.5 text-xs">
                                  <Gem className="w-3.5 h-3.5" />
                                  {roleNames[ROLES.DUKE]}
                                </span>
                              </SelectItem>
                              <SelectItem value={ROLES.KNIGHT}>
                                <span className="flex items-center gap-1.5 text-xs">
                                  <Sword className="w-3.5 h-3.5" />
                                  {roleNames[ROLES.KNIGHT]}
                                </span>
                              </SelectItem>
                              <SelectItem value={ROLES.CIVILIAN}>
                                <span className="flex items-center gap-1.5 text-xs">
                                  <User2 className="w-3.5 h-3.5" />
                                  {roleNames[ROLES.CIVILIAN]}
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(usr.id, usr.username || usr.email || 'Unnamed')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 