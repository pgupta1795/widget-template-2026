@echo off
SET TUNNEL_NAME=tanstack-start-widget-template.euw
SET PORT=3999

echo Checking if tunnel "%TUNNEL_NAME%" exists...
:: This attempts to create the tunnel. If it exists, it moves to the next step.
devtunnel create %TUNNEL_NAME% --allow-anonymous

echo.
echo Setting up port %PORT% for tunnel %TUNNEL_NAME%...
devtunnel port create %TUNNEL_NAME% -p %PORT% --protocol http

echo.
echo Your tunnel is ready! Your fixed URL will look like:
echo https://%TUNNEL_NAME%.[region].devtunnels.ms
echo.
echo Starting tunnel...
devtunnel host %TUNNEL_NAME%
pause