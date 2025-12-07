import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Link as MuiLink,
  Collapse,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import { CircleStar, CalendarDays } from 'lucide-react'
import { useState } from 'react'

const DRAWER_WIDTH = 240
const HEADER_HEIGHT = 64

interface NavItem {
  text: string
  icon: React.ReactNode
  path?: string
  children?: { text: string; path: string; icon?: React.ReactNode }[]
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  {
    text: 'The Furlong',
    icon: <CircleStar size={24} />,
    children: [
      { text: 'Planner', path: '/dashboard/the-furlong/planner', icon: <CalendarDays size={20} /> },
      { text: 'Racing Tracker', path: '/dashboard/the-furlong/racing-tracker', icon: <TimelineIcon /> },
    ],
  },
  { text: 'Accounts', icon: <AccountBalanceIcon />, path: '/dashboard/accounts' },
  { text: 'Bets', icon: <ReceiptIcon />, path: '/dashboard/bets' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/dashboard/settings' },
]

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ 'The Furlong': true })
  const location = useLocation()

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuToggle = (text: string) => {
    setOpenMenus((prev) => ({ ...prev, [text]: !prev[text] }))
  }

  const isActive = (path: string) => location.pathname === path

  const isParentActive = (children?: { path: string }[]) => {
    if (!children) return false
    return children.some((child) => location.pathname === child.path)
  }

  const drawer = (
    <List>
      {navItems.map((item) => (
        <Box key={item.text}>
          {item.children ? (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleMenuToggle(item.text)}
                  sx={{
                    backgroundColor: isParentActive(item.children) ? 'action.selected' : 'transparent',
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                  {openMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={openMenus[item.text]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.text} disablePadding>
                      <ListItemButton
                        component={Link}
                        to={child.path}
                        sx={{
                          pl: 4,
                          backgroundColor: isActive(child.path) ? 'action.selected' : 'transparent',
                        }}
                      >
                        {child.icon && <ListItemIcon>{child.icon}</ListItemIcon>}
                        <ListItemText primary={child.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </>
          ) : (
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to={item.path!}
                sx={{
                  backgroundColor: isActive(item.path!) ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )}
        </Box>
      ))}
    </List>
  )

  return (
    <Box className="min-h-screen">
      {/* Full Width Top Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar className="justify-between">
          <Box className="flex items-center gap-2">
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              EliteMB
            </Typography>
          </Box>
          <IconButton onClick={handleProfileClick}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              A
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleClose}>My Account</MenuItem>
            <MenuItem onClick={handleClose}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Left Sidebar - Below Header */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            top: HEADER_HEIGHT,
            height: `calc(100% - ${HEADER_HEIGHT}px)`,
          },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            top: HEADER_HEIGHT,
            height: `calc(100% - ${HEADER_HEIGHT}px)`,
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: `${HEADER_HEIGHT}px`,
          p: 3,
          minHeight: `calc(100vh - ${HEADER_HEIGHT}px - 48px)`,
        }}
      >
        <Outlet />
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          ml: { md: `${DRAWER_WIDTH}px` },
          py: 1.5,
          px: 3,
          backgroundColor: 'white',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box className="flex justify-between items-center">
          <Typography variant="caption" color="text.secondary">
            2024 EliteMB. All rights reserved.
          </Typography>
          <Box className="flex gap-4">
            <MuiLink
              href="#"
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
            >
              Privacy Policy
            </MuiLink>
            <MuiLink
              href="#"
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
            >
              Terms of Service
            </MuiLink>
            <MuiLink
              href="#"
              underline="hover"
              sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
            >
              Support
            </MuiLink>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
