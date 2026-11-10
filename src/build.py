import sys
out=sys.argv[1]
open(out,'w').write(open('head.html').read()+open('game.js').read()+open('tail.html').read())
print(out)
