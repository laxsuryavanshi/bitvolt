'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { GetUserCommand, IAMClient } from '@aws-sdk/client-iam';
import AppsIcon from '@mui/icons-material/Apps';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import StarIcon from '@mui/icons-material/Star';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Toolbar from '@mui/material/Toolbar';

import { useS3Config } from '@/context/s3config';

const drawerWidth = 240;

const sidenavMenu: { label: string; icon: React.ReactNode; href: string }[] = [
  {
    label: 'All Files',
    icon: <AutoAwesomeMosaicIcon fontSize="small" />,
    href: '/app',
  },
  {
    label: 'Recent',
    icon: <ScheduleIcon fontSize="small" />,
    href: '/app/recent',
  },
  {
    label: 'Starred',
    icon: <StarIcon fontSize="small" />,
    href: '/app/starred',
  },
  {
    label: 'Shared',
    icon: <FolderSharedIcon fontSize="small" />,
    href: '/app/shared',
  },
  {
    label: 'Trash',
    icon: <DeleteIcon fontSize="small" />,
    href: '/app/trash',
  },
];

const px = (value: number) => `${value.toString()}px`;

const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { config } = useS3Config();
  const [username, setUsername] = useState<string>('');

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);

  const handleClose = () => setAnchorEl(null);

  useEffect(() => {
    if (!config) {
      router.replace('/');
    }
  }, [config, router]);

  useEffect(() => {
    if (!config) {
      return;
    }

    const client = new IAMClient({
      credentials: { accessKeyId: config.accessKeyID, secretAccessKey: config.secretAccessKey },
      region: config.region,
    });

    client.send(new GetUserCommand()).then(response => setUsername(response.User?.UserName ?? ''));
  }, [config]);

  if (!config) return null;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        color="inherit"
        elevation={0}
        sx={{
          width: `calc(100% - ${px(drawerWidth)})`,
          ml: px(drawerWidth),
        }}
      >
        <Toolbar>
          <div className="flex-1" />
          <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '56px' }}>
            <IconButton size="large" color="inherit">
              <AppsIcon />
            </IconButton>
            <IconButton size="large" color="inherit">
              <NotificationsIcon />
            </IconButton>
            {username && (
              <>
                <Button color="inherit" endIcon={<ArrowDropDownIcon />} onClick={handleOpen}>
                  {username}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  onClick={e => e.stopPropagation()}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{ paper: { sx: { minWidth: 200, px: 2, mt: 1, boxShadow: 3 } } }}
                >
                  <ListItem disableGutters>
                    <ListItemText
                      primary={username}
                      secondary="Free Plan"
                      slotProps={{
                        secondary: {
                          variant: 'caption',
                          fontWeight: 700,
                          color: 'inherit',
                        },
                      }}
                    />
                  </ListItem>

                  <Divider sx={{ mb: 1 }} />

                  <ToggleButtonGroup fullWidth size="small" exclusive sx={{ mb: 1 }}>
                    <ToggleButton value="light">
                      <LightModeIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="dark">
                      <DarkModeIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="system">
                      <SettingsBrightnessIcon fontSize="small" />
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <MenuItem sx={{ borderRadius: 1 }}>
                    <ListItemIcon>
                      <ManageAccountsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Account" />
                  </MenuItem>

                  <MenuItem sx={theme => ({ borderRadius: 1, color: theme.palette.error.main })}>
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        open
      >
        <Toolbar>
          <Link
            href="/app"
            color="inherit"
            variant="h5"
            fontWeight={700}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              userSelect: 'none',
            }}
          >
            <Image src="/music-robot-96.png" alt="bitvolt" width={48} height={48} />
            <span>bitvolt</span>
          </Link>
        </Toolbar>
        <List dense>
          {sidenavMenu.map(item => (
            <ListItem key={item.href}>
              <ListItemButton
                href={item.href}
                selected={pathname === item.href}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: px(24) }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, py: 3, px: 4 }}>
        <Toolbar />
        <Box className="">{children}</Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
