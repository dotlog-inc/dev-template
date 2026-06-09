FROM node:22-alpine

RUN npm install -g firebase-tools

WORKDIR /home/node

COPY local/firebase/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4000 9099

CMD ["/usr/local/bin/entrypoint.sh"]
