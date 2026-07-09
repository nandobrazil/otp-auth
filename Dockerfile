FROM nginx:alpine
ARG VERSION=dev
COPY index.html style.css script.js /usr/share/nginx/html/
RUN sed -i "s/__VERSION__/${VERSION}/g" /usr/share/nginx/html/index.html
EXPOSE 80
