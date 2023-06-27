import * as React from 'react';
import { Box, Typography } from '@mui/material';



export default function StickyFooter() {
  return (
    <Box 
      component="footer" 
      sx={{
        backgroundColor: 'grey',
        position: 'fixed',
        left: 0,
        bottom: 0,
        right: 0,
        p: 2
      }}
    >
      <Typography variant="body2" color="white" align="center">
        © {new Date().getFullYear()} NTT DATA Financila Technology Inc.
      </Typography>
    </Box>
  );
  
}