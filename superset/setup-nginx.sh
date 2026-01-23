#!/bin/bash

# Nginx Setup Script for Superset Proxy
# =====================================
# This script helps you set up Nginx as a reverse proxy for Superset

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Check if Nginx is installed
check_nginx() {
    if ! command -v nginx &> /dev/null; then
        print_warning "Nginx is not installed. Installing Nginx..."
        sudo apt update
        sudo apt install -y nginx
        print_success "Nginx installed successfully!"
    else
        print_success "Nginx is already installed."
    fi
}

# Get domain name from user
get_domain() {
    echo ""
    print_status "Domain Configuration"
    echo "Enter your domain name (or press Enter to use 'localhost' for testing):"
    read -p "Domain: " domain
    
    if [[ -z "$domain" ]]; then
        domain="localhost"
        print_warning "Using 'localhost' as domain. This is suitable for testing only."
    else
        print_success "Using domain: $domain"
    fi
}

# Create Nginx configuration
create_nginx_config() {
    print_status "Creating Nginx configuration..."
    
    # Create the configuration file
    config_file="/etc/nginx/sites-available/superset"
    
    sudo tee "$config_file" > /dev/null <<EOF
# Superset Nginx Configuration
server {
    listen 80;
    listen [::]:80;
    
    server_name $domain;
    
    location / {
        proxy_pass http://localhost:8088;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Handle large uploads
        client_max_body_size 100M;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8088/health;
        proxy_set_header Host \$host;
        access_log off;
    }
    
    # Security headers
    # add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/superset_access.log;
    error_log /var/log/nginx/superset_error.log;
}
EOF
    
    print_success "Nginx configuration created at $config_file"
}

# Enable the site
enable_site() {
    print_status "Enabling Superset site..."
    
    # Remove default site if it exists
    if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
        sudo rm /etc/nginx/sites-enabled/default
        print_success "Removed default Nginx site"
    fi
    
    # Enable superset site
    sudo ln -sf /etc/nginx/sites-available/superset /etc/nginx/sites-enabled/
    print_success "Superset site enabled"
}

# Test and reload Nginx
reload_nginx() {
    print_status "Testing Nginx configuration..."
    
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
        
        print_status "Reloading Nginx..."
        sudo systemctl reload nginx
        print_success "Nginx reloaded successfully"
        
        # Ensure Nginx is enabled and started
        sudo systemctl enable nginx
        sudo systemctl start nginx
        
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
}

# Check if Superset is running
check_superset() {
    print_status "Checking if Superset is running..."
    
    if curl -s http://localhost:8088/health > /dev/null; then
        print_success "Superset is running and accessible on port 8088"
    else
        print_warning "Superset doesn't seem to be running on port 8088"
        print_warning "Make sure to start Superset with 'make start' before testing the proxy"
    fi
}

# Show final instructions
show_instructions() {
    echo ""
    echo "🎉 Nginx setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start your Superset containers: make start"
    echo "2. Access Superset through Nginx:"
    if [[ "$domain" == "localhost" ]]; then
        echo "   → http://localhost"
    else
        echo "   → http://$domain"
    fi
    echo ""
    echo "🔧 Useful Commands:"
    echo "   sudo nginx -t                    # Test configuration"
    echo "   sudo systemctl reload nginx     # Reload Nginx"
    echo "   sudo systemctl status nginx     # Check Nginx status"
    echo "   tail -f /var/log/nginx/superset_*.log  # View logs"
    echo ""
    echo "🔒 For HTTPS setup:"
    echo "   Consider using Let's Encrypt with certbot:"
    echo "   sudo apt install certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d $domain"
}

# Main execution
main() {
    echo "🚀 Nginx Setup for Superset Proxy"
    echo "=================================="
    
    check_root
    check_nginx
    get_domain
    create_nginx_config
    enable_site
    reload_nginx
    check_superset
    show_instructions
}

# Run main function
main "$@"
