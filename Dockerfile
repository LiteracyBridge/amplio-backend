FROM python:3.8

ADD ./backend ./app

# COPY .//requirements.txt ./requirements.txt
WORKDIR /app

RUN pip install -r ./requirements.txt

ENV HOST="0.0.0.0"
ENV PORT=5000

CMD uvicorn app:app --host ${HOST} --port ${PORT}
