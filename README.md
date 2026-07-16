# Homelab Projects

A collection of self-hosted services, scripts, development environments, and applications running on my local homelab server.

## Projects List

* **[ALTupe](./ALTupe)**: A YouTube-style video sharing platform clone featuring a FastAPI backend and a React-based frontend.
* **[CentralAgent](./CentralAgent)**: Central automation controller and CI/CD server leveraging Jenkins and system monitoring tools.
* **[alhassanAgent](./alhassanAgent)**: An autonomous AI agent implementation or helper script for local server automation.
* **[alhassanChat](./alhassanChat)**: A web-based chat application built with modern frontend frameworks.
* **[alhassanP](./alhassanP)**: A personal portfolio site with integrated contact forms and email triggers.
* **[chatalhassan](./chatalhassan)**: A minimal real-time chat application for direct messaging.
* **[chrom_ui](./chrom_ui)**: A Chrome extension frontend designed for seamless browser-based interactions.
* **[gogoalhassan](./gogoalhassan)**: A self-hosted private Git server instance using the Gogs container stack.
* **[hddAcss](./hddAcss)**: A dashboard to monitor and manage local storage disk space and file transfers.
* **[healthCareSys](./healthCareSys)**: A hospital database and patient management dashboard prototype.
* **[mailalhassan](./mailalhassan)**: A self-hosted custom mail server configuration and client dashboard.
* **[market_agent](./market_agent)**: Automated web scraper or AI agent designed for e-commerce and market analysis.
* **[meetalhassan](./meetalhassan)**: A Docker-based deployment configuration for a private Jitsi Meet video conferencing instance.
* **[puzzle](./puzzle)**: An interactive, web-based sliding puzzle game built with React.
* **[routerSignal](./routerSignal)**: Automated monitor that periodically logs network signal statistics and band data from LTE modems.
* **[server-dashboard](./server-dashboard)**: A containerized monitoring stack utilizing Prometheus and Grafana for system metrics.
* **[shehata_reg](./shehata_reg)**: A passenger registration and booking system for private shuttle/trip management.
* **[talkTOserver](./talkTOserver)**: Remote execution API enabling shell commands and server operations via web requests.
* **[torentAlhassan](./torentAlhassan)**: A web-based client manager interface for handling torrent downloads.
* **[vscode](./vscode)**: A containerized VS Code (code-server) configuration for browser-based development.
* **[zaid_bot](./zaid_bot)**: An automated notification chatbot designed for system updates.

## Getting Started

Each project folder contains its respective container setup (`docker-compose.yml`) or source files. To deploy any service, navigate to its folder and run:
```bash
docker compose up -d
```

## Security & Sanitization
All secrets, passwords, GMail app credentials, and private keys have been scrubbed from this repository and replaced with generic environment configuration placeholders.
