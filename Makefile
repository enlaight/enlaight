.PHONY: start stop clear build reset test

COMPOSE_FILE := docker-compose-dev.yml

start:
	docker compose -f $(COMPOSE_FILE) up $(filter-out $@,$(MAKECMDGOALS))

stop:
	docker compose -f $(COMPOSE_FILE) stop

clear:
	docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans

build:
	docker compose -f $(COMPOSE_FILE) build --no-cache $(filter-out $@,$(MAKECMDGOALS))

init:
	make build
	bash create_defaults.sh
	make start

reset:
	make clear
	docker compose -f $(COMPOSE_FILE) build --no-cache
	make start

test:
# 	Run tests in running frontend container:
# 	docker compose -f $(COMPOSE_FILE) exec frontend npm test

#	Run tests in a new container (builds if necessary):
	docker compose -f $(COMPOSE_FILE) run --rm --build frontend npm test

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

%:
	@:

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

help: ## 📋 Show this help message
	@echo ""
	@echo "$(BLUE)🚀 Enlaight Docker Management Commands$(RESET)"
	@echo "$(BLUE)======================================$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-12s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)💡 Usage Examples:$(RESET)"
	@echo "  make start		# Start all services with logs"
	@echo "  make stop		# Stop all running services"
	@echo "  make clear		# Complete cleanup (stops, removes volumes & images)"
	@echo "  make build		# Build all services without cache"
	@echo "  make reset		# Complete cleanup (!), build without cache and start"
	@echo "  make test		# To be implemented"
	@echo ""
	@echo "  Note: using 'make start/build <service_name> <service_name>' will run/build only the given service(s)"
	@echo ""