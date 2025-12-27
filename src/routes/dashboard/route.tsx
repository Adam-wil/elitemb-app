import { createFileRoute, Outlet, Link, useLocation, useNavigate } from '@tanstack/react-router'
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
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Badge,
  Tooltip,
  Divider,
  Popover,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  AccountBalance as AccountBalanceIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Timeline as TimelineIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material'
import { CircleStar, CalendarDays, BookOpen, Warehouse, Home, TrendingUp, CreditCard, Cog, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'

const DRAWER_WIDTH = 240
const DRAWER_WIDTH_COLLAPSED = 64
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
      { text: 'Racing Dashboard', path: '/dashboard/the-furlong/racing-dashboard', icon: <DashboardIcon /> },
      { text: 'Planner', path: '/dashboard/the-furlong/planner', icon: <CalendarDays size={20} /> },
      { text: 'Racing Manager', path: '/dashboard/the-furlong/racing-tracker', icon: <TimelineIcon /> },
      { text: 'The Stable', path: '/dashboard/the-furlong/the-stable', icon: <Warehouse size={20} /> },
      { text: 'Lay Manager', path: '/dashboard/non-promo', icon: <TableChartIcon /> },
      { text: 'Bookie List', path: '/dashboard/the-furlong/bookie-list', icon: <BookOpen size={20} /> },
    ],
  },
  { text: 'Accounts', icon: <AccountBalanceIcon />, path: '/dashboard/accounts' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/dashboard/settings' },
]

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

// Bottom navigation items for mobile
const bottomNavItems = [
  { label: 'Home', icon: <Home size={22} />, path: '/dashboard' },
  { label: 'Racing', icon: <TrendingUp size={22} />, path: '/dashboard/the-furlong/racing-tracker' },
  { label: 'Accounts', icon: <CreditCard size={22} />, path: '/dashboard/accounts' },
  { label: 'Settings', icon: <Cog size={22} />, path: '/dashboard/settings' },
]

function DashboardLayout() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ 'The Furlong': true })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [popoverAnchor, setPopoverAnchor] = useState<{ el: HTMLElement; item: NavItem } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Mobile detection
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Current drawer width based on collapsed state
  const currentDrawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH

  // Popover handlers for collapsed nested menus
  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, item: NavItem) => {
    if (sidebarCollapsed && item.children) {
      setPopoverAnchor({ el: event.currentTarget, item })
    }
  }

  const handlePopoverClose = () => {
    setPopoverAnchor(null)
  }

  // Calculate active bottom nav index based on current path
  const bottomNavValue = useMemo(() => {
    const path = location.pathname
    if (path === '/dashboard') return 0
    if (path.includes('/the-furlong') || path.includes('/non-promo')) return 1
    if (path.includes('/accounts')) return 2
    if (path.includes('/settings')) return 3
    return 0
  }, [location.pathname])

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

  // Drawer content - adapts to collapsed state
  const renderDrawerContent = (collapsed: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Collapse/Expand toggle button at top - only shown on desktop */}
      {!isMobile && (
        <>
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'flex-end',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
              <IconButton
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                size="medium"
                sx={{
                  backgroundColor: '#fff',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '8px',
                  width: collapsed ? 40 : 36,
                  height: 36,
                  '&:hover': {
                    backgroundColor: '#f0f9ff',
                    borderColor: '#3b82f6',
                  },
                }}
              >
                {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {navItems.map((item) => (
          <Box key={item.text}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={(e) => {
                      e.stopPropagation()
                      if (collapsed) {
                        setPopoverAnchor({ el: e.currentTarget, item })
                      } else {
                        handleMenuToggle(item.text)
                      }
                    }}
                    sx={{
                      backgroundColor: isParentActive(item.children) ? 'action.selected' : 'transparent',
                      minHeight: 48,
                      justifyContent: collapsed ? 'center' : 'initial',
                      px: collapsed ? 2 : 2.5,
                      '&:hover': {
                        backgroundColor: collapsed ? 'action.hover' : undefined,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: collapsed ? 0 : 2,
                        justifyContent: 'center',
                        color: isParentActive(item.children) ? 'primary.main' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText primary={item.text} />
                        {openMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
                      </>
                    )}
                  </ListItemButton>
                </ListItem>
                {!collapsed && (
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
                              minHeight: 44,
                            }}
                          >
                            {child.icon && (
                              <ListItemIcon
                                sx={{
                                  minWidth: 0,
                                  mr: 2,
                                  color: isActive(child.path) ? 'primary.main' : 'inherit',
                                }}
                              >
                                {child.icon}
                              </ListItemIcon>
                            )}
                            <ListItemText
                              primary={child.text}
                              primaryTypographyProps={{
                                fontSize: '0.875rem',
                                fontWeight: isActive(child.path) ? 600 : 400,
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </>
            ) : (
              <ListItem disablePadding>
                <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
                  <ListItemButton
                    component={Link}
                    to={item.path!}
                    sx={{
                      backgroundColor: isActive(item.path!) ? 'action.selected' : 'transparent',
                      minHeight: 48,
                      justifyContent: collapsed ? 'center' : 'initial',
                      px: collapsed ? 2 : 2.5,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: collapsed ? 0 : 2,
                        justifyContent: 'center',
                        color: isActive(item.path!) ? 'primary.main' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            )}
          </Box>
        ))}
      </List>

    </Box>
  )

  // Mobile drawer - no collapse button needed
  const mobileDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {navItems.map((item) => (
          <Box key={item.text}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleMenuToggle(item.text)}
                    sx={{
                      backgroundColor: isParentActive(item.children) ? 'action.selected' : 'transparent',
                      minHeight: 48,
                      px: 2.5,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: 2,
                        justifyContent: 'center',
                        color: isParentActive(item.children) ? 'primary.main' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
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
                          onClick={() => setMobileOpen(false)}
                          sx={{
                            pl: 4,
                            backgroundColor: isActive(child.path) ? 'action.selected' : 'transparent',
                            minHeight: 44,
                          }}
                        >
                          {child.icon && (
                            <ListItemIcon
                              sx={{
                                minWidth: 0,
                                mr: 2,
                                color: isActive(child.path) ? 'primary.main' : 'inherit',
                              }}
                            >
                              {child.icon}
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={child.text}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isActive(child.path) ? 600 : 400,
                            }}
                          />
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
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    backgroundColor: isActive(item.path!) ? 'action.selected' : 'transparent',
                    minHeight: 48,
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 2,
                      justifyContent: 'center',
                      color: isActive(item.path!) ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )}
          </Box>
        ))}
      </List>
    </Box>
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
        {mobileDrawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: currentDrawerWidth,
            top: HEADER_HEIGHT,
            height: `calc(100% - ${HEADER_HEIGHT}px)`,
            transition: 'width 0.2s ease-in-out',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {renderDrawerContent(sidebarCollapsed)}
      </Drawer>

      {/* Popover for collapsed sidebar nested menus */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor?.el}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPopover-paper': {
            ml: 1,
            minWidth: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: 2,
          },
        }}
      >
        {popoverAnchor?.item.children && (
          <Box sx={{ py: 1 }}>
            <Typography
              sx={{
                px: 2,
                py: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'text.secondary',
                letterSpacing: '0.05em',
              }}
            >
              {popoverAnchor.item.text}
            </Typography>
            <List disablePadding>
              {popoverAnchor.item.children.map((child) => (
                <ListItem key={child.text} disablePadding>
                  <ListItemButton
                    component={Link}
                    to={child.path}
                    onClick={handlePopoverClose}
                    sx={{
                      py: 1,
                      px: 2,
                      backgroundColor: isActive(child.path) ? 'action.selected' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    {child.icon && (
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: 1.5,
                          color: isActive(child.path) ? 'primary.main' : 'inherit',
                        }}
                      >
                        {child.icon}
                      </ListItemIcon>
                    )}
                    <ListItemText
                      primary={child.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive(child.path) ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Popover>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { md: `${currentDrawerWidth}px` },
          mt: `${HEADER_HEIGHT}px`,
          p: { xs: 2, md: 3 },
          pb: { xs: '80px', md: 3 }, // Extra bottom padding on mobile for bottom nav
          minHeight: `calc(100vh - ${HEADER_HEIGHT}px - 48px)`,
          transition: 'margin-left 0.2s ease-in-out',
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            borderTop: '1px solid #e5e7eb',
            pb: 'env(safe-area-inset-bottom)', // iOS safe area
          }}
          elevation={3}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={(_, newValue) => {
              navigate({ to: bottomNavItems[newValue].path })
            }}
            showLabels
            sx={{
              height: 64,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 70,
                py: 1,
                '&.Mui-selected': {
                  color: '#3b82f6',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.7rem',
                fontWeight: 500,
                mt: 0.5,
                '&.Mui-selected': {
                  fontSize: '0.7rem',
                  fontWeight: 600,
                },
              },
            }}
          >
            {bottomNavItems.map((item) => (
              <BottomNavigationAction
                key={item.label}
                label={item.label}
                icon={item.icon}
                sx={{ color: '#6b7280' }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      {/* Footer - Hidden on mobile */}
      <Box
        component="footer"
        sx={{
          display: { xs: 'none', md: 'block' },
          ml: { md: `${currentDrawerWidth}px` },
          py: 1.5,
          px: 3,
          backgroundColor: 'white',
          borderTop: '1px solid',
          borderColor: 'divider',
          transition: 'margin-left 0.2s ease-in-out',
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
