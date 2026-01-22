export interface AdminLog {
  id: string;
  timestamp: Date;
  action: string;
  entity: string;
  entityName: string;
  details?: string;
  username: string;
  ipAddress?: string;
  status: "success" | "failed";
}

export const logAdminActivity = (
  action: string,
  entity: string,
  entityName: string,
  details?: string,
  status: "success" | "failed" = "success"
) => {
  const username = localStorage.getItem("adminUsername") || "admin";
  const logs = getAdminLogs();
  
  const newLog: AdminLog = {
    id: Date.now().toString(),
    timestamp: new Date(),
    action,
    entity,
    entityName,
    details,
    username,
    status,
  };

  logs.unshift(newLog);
  
  // Keep only last 500 logs
  if (logs.length > 500) {
    logs.splice(500);
  }

  localStorage.setItem("adminLogs", JSON.stringify(logs));
};

export const getAdminLogs = (): AdminLog[] => {
  const saved = localStorage.getItem("adminLogs");
  if (!saved) return [];
  
  const logs = JSON.parse(saved);
  interface AdminLog {
    timestamp: string | Date;
    [key: string]: unknown;
  }

  return logs.map((log: AdminLog) => ({
    ...log,
    timestamp: new Date(log.timestamp),
  }));
};

export const getLogIcon = (entity: string) => {
  switch (entity.toLowerCase()) {
    case "menu item":
      return "🍽️";
    case "category":
      return "📁";
    case "table":
      return "🪑";
    case "cashier":
      return "👤";
    case "login":
      return "🔐";
    case "profile":
      return "⚙️";
    default:
      return "📝";
  }
};

export const getActionColor = (action: string) => {
  switch (action.toLowerCase()) {
    case "added":
    case "created":
      return "text-green-500 bg-green-500/10";
    case "updated":
    case "edited":
      return "text-blue-500 bg-blue-500/10";
    case "deleted":
    case "removed":
      return "text-red-500 bg-red-500/10";
    case "login":
      return "text-purple-500 bg-purple-500/10";
    default:
      return "text-gray-500 bg-gray-500/10";
  }
};

